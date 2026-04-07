import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = Number(process.env.PORT || 3001);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'app-data.json');
const uploadDir = path.join(dataDir, 'uploads');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3001,http://localhost:3001')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedDataKeys = [
    'products',
    'users',
    'savedBudgets',
    'companyData',
    'stockMovements',
    'financialEntries',
    'accessHistory',
    'leadContacts',
    'logisticsEntries'
];

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origem nao permitida pelo servidor.'));
    }
}));
app.use(express.json({ limit: '15mb' }));

app.use('/backend', (_request, response) => {
    response.status(403).json({ ok: false, message: 'Acesso negado.' });
});

app.use('/uploads', express.static(uploadDir));

app.use(express.static(projectRoot, {
    index: 'index.html'
}));

async function ensureDataFile() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(uploadDir, { recursive: true });

    try {
        await fs.access(dataFile);
    } catch {
        await fs.writeFile(dataFile, JSON.stringify({ updatedAt: null }, null, 2), 'utf8');
    }
}

async function readAppData() {
    await ensureDataFile();
    const raw = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(raw || '{}');
}

async function writeAppData(nextData) {
    await ensureDataFile();
    await fs.writeFile(dataFile, JSON.stringify({
        ...nextData,
        updatedAt: new Date().toISOString()
    }, null, 2), 'utf8');
}

function sanitizeAppData(payload = {}) {
    return allowedDataKeys.reduce((accumulator, key) => {
        if (key in payload) accumulator[key] = payload[key];
        return accumulator;
    }, {});
}

function getPasswordValidationMessage(password) {
    const value = String(password || '').trim();
    const normalized = value.toLowerCase();
    const forbidden = new Set([
        '123456',
        '12345678',
        '123456789',
        'senha123',
        'senha1234',
        'qwerty123',
        'password',
        'admin123',
        'abcdef',
        'abc12345'
    ]);

    if (value.length < 8) return 'Use pelo menos 8 caracteres.';
    if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) return 'Use pelo menos uma letra e um numero.';
    if (forbidden.has(normalized)) return 'Escolha uma senha menos previsivel.';
    if (/^(\d)\1+$/.test(value)) return 'Nao use apenas numeros repetidos.';
    if (/0123|1234|2345|3456|4567|5678|6789/.test(value)) return 'Nao use sequencias numericas simples.';
    return '';
}

async function saveBase64Image(dataUrl = '') {
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new Error('Formato de imagem invalido.');
    }

    const mimeType = match[1];
    const base64Payload = match[2];
    const extensionMap = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
    };
    const extension = extensionMap[mimeType] || 'png';
    const buffer = Buffer.from(base64Payload, 'base64');
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 20);
    const fileName = `${hash}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);
    return `/uploads/${fileName}`;
}

function createTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD;

    if (!user || !pass) {
        throw new Error('Credenciais de e-mail ausentes. Configure EMAIL_USER e EMAIL_APP_PASSWORD.');
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

function createResendClient() {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) return null;
    return new Resend(apiKey);
}

async function sendEmailMessage({ to, subject, html, text, from, replyTo }) {
    const resend = createResendClient();
    if (resend) {
        const sender = String(from || process.env.RESEND_FROM || 'Mobilier <onboarding@resend.dev>').trim();
        await resend.emails.send({
            from: sender,
            to,
            subject,
            html,
            text,
            replyTo
        });
        return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
        from,
        to,
        replyTo,
        subject,
        text,
        html: `<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">${html}`
    });
}

function getPublicBaseUrl(request) {
    if (process.env.PUBLIC_BASE_URL) {
        return String(process.env.PUBLIC_BASE_URL).replace(/\/$/, '');
    }

    return `${request.protocol}://${request.get('host')}`;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildRegistrationEmail({ name, email, phone, address, notes }) {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || '-');
    const safeAddress = escapeHtml(address || '-');
    const safeNotes = escapeHtml(notes || '-');

    return {
        subject: 'Cadastro confirmado - Mobilier',
        html: `
            <div style="margin:0; padding:32px; background:#f3f6fb; font-family:Arial,sans-serif; color:#17304f;">
                <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 48px rgba(23,48,79,0.12);">
                    <div style="padding:28px 32px; background:linear-gradient(180deg,#17304f 0%,#284a73 100%); color:#ffffff;">
                        <h1 style="margin:0; font-size:28px;">Cadastro confirmado</h1>
                        <p style="margin:10px 0 0; color:rgba(255,255,255,0.82);">Seu atendimento com a Mobilier já pode continuar.</p>
                    </div>
                    <div style="padding:28px 32px;">
                        <p style="margin:0 0 16px;">Olá, <strong>${safeName}</strong>.</p>
                        <p style="margin:0 0 18px; line-height:1.7;">Recebemos seu cadastro com sucesso. Nossa equipe já consegue identificar seus dados para acelerar orçamentos, vendas e atendimento comercial.</p>
                        <div style="padding:18px; border-radius:18px; background:#f8fafc; border:1px solid #e2e8f0;">
                            <p style="margin:0 0 10px;"><strong>E-mail:</strong> ${safeEmail}</p>
                            <p style="margin:0 0 10px;"><strong>Telefone:</strong> ${safePhone}</p>
                            <p style="margin:0 0 10px;"><strong>Endereço:</strong> ${safeAddress}</p>
                            <p style="margin:0;"><strong>Observações:</strong> ${safeNotes}</p>
                        </div>
                        <p style="margin:22px 0 0; line-height:1.7;">Se precisar ajustar algum dado, basta retornar ao site e atualizar seu perfil.</p>
                    </div>
                </div>
            </div>
        `,
        text: [
            'Cadastro confirmado - Mobilier',
            '',
            `Olá, ${name}.`,
            'Recebemos seu cadastro com sucesso.',
            `E-mail: ${email}`,
            `Telefone: ${phone || '-'}`,
            `Endereço: ${address || '-'}`,
            `Observações: ${notes || '-'}`
        ].join('\n')
    };
}

function buildPasswordResetEmail({ name, resetUrl }) {
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(resetUrl);

    return {
        subject: 'Recuperacao de senha - Mobilier',
        html: `
            <div style="margin:0; padding:32px; background:#f3f6fb; font-family:Arial,sans-serif; color:#17304f;">
                <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 48px rgba(23,48,79,0.12);">
                    <div style="padding:28px 32px; background:linear-gradient(180deg,#17304f 0%,#284a73 100%); color:#ffffff;">
                        <h1 style="margin:0; font-size:28px;">Redefinir senha</h1>
                        <p style="margin:10px 0 0; color:rgba(255,255,255,0.82);">Recebemos um pedido para trocar sua senha.</p>
                    </div>
                    <div style="padding:28px 32px;">
                        <p style="margin:0 0 16px;">Ola, <strong>${safeName}</strong>.</p>
                        <p style="margin:0 0 18px; line-height:1.7;">Clique no botao abaixo para criar uma nova senha. Esse link expira em 1 hora.</p>
                        <p style="margin:24px 0;">
                            <a href="${safeUrl}" style="display:inline-block; padding:14px 22px; border-radius:999px; background:linear-gradient(135deg,#f4e4b1 0%,#d4af37 100%); color:#17304f; font-weight:700; text-decoration:none;">Criar nova senha</a>
                        </p>
                        <p style="margin:0; line-height:1.7; color:#475569;">Se voce nao pediu essa troca, pode ignorar este e-mail.</p>
                    </div>
                </div>
            </div>
        `,
        text: [
            'Recuperacao de senha - Mobilier',
            '',
            `Ola, ${name}.`,
            'Recebemos um pedido para trocar sua senha.',
            'Acesse o link abaixo para criar uma nova senha:',
            resetUrl,
            '',
            'Esse link expira em 1 hora.'
        ].join('\n')
    };
}

function buildAdminUserCreatedEmail({ name, resetUrl, email }) {
    const safeName = escapeHtml(name || 'Cliente');
    const safeUrl = escapeHtml(resetUrl);
    const safeEmail = escapeHtml(email || '-');

    return {
        subject: 'Seu cadastro foi criado - Mobilier',
        html: `
            <div style="margin:0; padding:32px; background:#f3f6fb; font-family:Arial,sans-serif; color:#17304f;">
                <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 48px rgba(23,48,79,0.12);">
                    <div style="padding:28px 32px; background:linear-gradient(180deg,#17304f 0%,#284a73 100%); color:#ffffff;">
                        <h1 style="margin:0; font-size:28px;">Seu acesso esta pronto</h1>
                        <p style="margin:10px 0 0; color:rgba(255,255,255,0.82);">Nossa equipe criou um cadastro para voce na Mobilier.</p>
                    </div>
                    <div style="padding:28px 32px;">
                        <p style="margin:0 0 16px;">Ola, <strong>${safeName}</strong>.</p>
                        <p style="margin:0 0 18px; line-height:1.7;">Foi criado um cadastro para o e-mail <strong>${safeEmail}</strong>. Para acessar com seguranca, defina sua senha no primeiro acesso pelo botao abaixo.</p>
                        <p style="margin:24px 0;">
                            <a href="${safeUrl}" style="display:inline-block; padding:14px 22px; border-radius:999px; background:linear-gradient(135deg,#f4e4b1 0%,#d4af37 100%); color:#17304f; font-weight:700; text-decoration:none;">Criar minha senha</a>
                        </p>
                        <div style="padding:18px; border-radius:18px; background:#fff7ed; border:1px solid #fed7aa;">
                            <p style="margin:0; line-height:1.7;"><strong>Importante:</strong> por seguranca, crie uma nova senha imediatamente e nao compartilhe esse link com outras pessoas.</p>
                        </div>
                    </div>
                </div>
            </div>
        `,
        text: [
            'Seu cadastro foi criado - Mobilier',
            '',
            `Ola, ${name || 'Cliente'}.`,
            `Foi criado um cadastro para o e-mail ${email || '-'}.`,
            'Para acessar com seguranca, defina sua senha no link abaixo:',
            resetUrl,
            '',
            'Importante: crie uma nova senha imediatamente e nao compartilhe esse link com outras pessoas.'
        ].join('\n')
    };
}

function buildBudgetCreatedEmail({ customerName, budgetId, total, eventName, deliveryDate, deliveryTime, address, items = [] }) {
    const safeName = escapeHtml(customerName || 'Cliente');
    const safeEvent = escapeHtml(eventName || 'Evento');
    const safeDelivery = escapeHtml([deliveryDate, deliveryTime].filter(Boolean).join(' as ') || '-');
    const safeAddress = escapeHtml(address || '-');
    const safeItems = items
        .map(item => `<li style="margin:0 0 8px;">${escapeHtml(item.name || 'Item')} x ${escapeHtml(item.quantity || 0)}</li>`)
        .join('');

    return {
        subject: `Orcamento recebido - #${budgetId}`,
        html: `
            <div style="margin:0; padding:32px; background:#f3f6fb; font-family:Arial,sans-serif; color:#17304f;">
                <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 48px rgba(23,48,79,0.12);">
                    <div style="padding:28px 32px; background:linear-gradient(180deg,#17304f 0%,#284a73 100%); color:#ffffff;">
                        <h1 style="margin:0; font-size:28px;">Orcamento recebido</h1>
                        <p style="margin:10px 0 0; color:rgba(255,255,255,0.82);">Recebemos seu pedido e ele ja entrou em analise da nossa equipe.</p>
                    </div>
                    <div style="padding:28px 32px;">
                        <p style="margin:0 0 16px;">Ola, <strong>${safeName}</strong>.</p>
                        <p style="margin:0 0 18px; line-height:1.7;">Seu orcamento <strong>#${budgetId}</strong> foi salvo com sucesso.</p>
                        <div style="padding:18px; border-radius:18px; background:#f8fafc; border:1px solid #e2e8f0;">
                            <p style="margin:0 0 10px;"><strong>Evento:</strong> ${safeEvent}</p>
                            <p style="margin:0 0 10px;"><strong>Entrega:</strong> ${safeDelivery}</p>
                            <p style="margin:0 0 10px;"><strong>Endereco:</strong> ${safeAddress}</p>
                            <p style="margin:0;"><strong>Total previsto:</strong> ${escapeHtml(total || 'R$ 0,00')}</p>
                        </div>
                        <div style="margin-top:18px;">
                            <p style="margin:0 0 8px;"><strong>Itens selecionados</strong></p>
                            <ul style="padding-left:20px; margin:0;">${safeItems || '<li>Nenhum item informado</li>'}</ul>
                        </div>
                    </div>
                </div>
            </div>
        `,
        text: [
            `Orcamento recebido - #${budgetId}`,
            '',
            `Cliente: ${customerName || 'Cliente'}`,
            `Evento: ${eventName || 'Evento'}`,
            `Entrega: ${[deliveryDate, deliveryTime].filter(Boolean).join(' as ') || '-'}`,
            `Endereco: ${address || '-'}`,
            `Total previsto: ${total || 'R$ 0,00'}`
        ].join('\n')
    };
}

function buildBudgetStatusEmail({ customerName, budgetId, status, total, eventName, cancelReason, suggestedDate, suggestedTime, originalDate, originalTime }) {
    const safeName = escapeHtml(customerName || 'Cliente');
    const safeStatus = escapeHtml(status || 'Atualizado');
    const safeEvent = escapeHtml(eventName || 'Evento');
    const safeCancelReason = escapeHtml(cancelReason || '');
    const safeSuggestedSlot = escapeHtml([suggestedDate, suggestedTime].filter(Boolean).join(' às '));
    const safeOriginalSlot = escapeHtml([originalDate, originalTime].filter(Boolean).join(' às '));
    const statusCopyMap = {
        Pendente: 'Seu pedido foi registrado e esta em analise da nossa equipe comercial.',
        Aprovado: 'Seu orcamento foi aprovado e ja esta seguindo para atendimento operacional.',
        Finalizado: 'Seu pedido foi finalizado. Se precisar de uma nova montagem, estamos a disposicao.',
        Cancelado: 'Seu orcamento foi encerrado no momento. Se quiser, podemos montar uma nova proposta.'
    };
    const statusCopy = statusCopyMap[status] || 'Seu orcamento recebeu uma atualizacao.';

    return {
        subject: `Atualizacao do pedido #${budgetId} - ${status || 'Atualizado'}`,
        html: `
            <div style="margin:0; padding:32px; background:#f3f6fb; font-family:Arial,sans-serif; color:#17304f;">
                <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 48px rgba(23,48,79,0.12);">
                    <div style="padding:28px 32px; background:linear-gradient(180deg,#17304f 0%,#284a73 100%); color:#ffffff;">
                        <h1 style="margin:0; font-size:28px;">Atualizacao do seu pedido</h1>
                        <p style="margin:10px 0 0; color:rgba(255,255,255,0.82);">O status do seu pedido foi atualizado.</p>
                    </div>
                    <div style="padding:28px 32px;">
                        <p style="margin:0 0 16px;">Ola, <strong>${safeName}</strong>.</p>
                        <p style="margin:0 0 18px; line-height:1.7;">${escapeHtml(statusCopy)}</p>
                        <div style="padding:18px; border-radius:18px; background:#f8fafc; border:1px solid #e2e8f0;">
                            <p style="margin:0 0 10px;"><strong>Orcamento:</strong> #${budgetId}</p>
                            <p style="margin:0 0 10px;"><strong>Evento:</strong> ${safeEvent}</p>
                            <p style="margin:0 0 10px;"><strong>Status:</strong> ${safeStatus}</p>
                            <p style="margin:0;"><strong>Total:</strong> ${escapeHtml(total || 'R$ 0,00')}</p>
                        </div>
                        ${status === 'Cancelado' && safeCancelReason ? `
                            <div style="margin-top:18px; padding:18px; border-radius:18px; background:#fff7ed; border:1px solid #fed7aa;">
                                <p style="margin:0 0 10px;"><strong>Motivo informado:</strong></p>
                                <p style="margin:0; line-height:1.7;">${safeCancelReason}</p>
                            </div>
                        ` : ''}
                        ${status === 'Cancelado' && (safeSuggestedSlot || safeOriginalSlot) ? `
                            <div style="margin-top:18px; padding:18px; border-radius:18px; background:#eff6ff; border:1px solid #bfdbfe;">
                                ${safeOriginalSlot ? `<p style="margin:0 0 10px;"><strong>Horario original:</strong> ${safeOriginalSlot}</p>` : ''}
                                ${safeSuggestedSlot ? `<p style="margin:0;"><strong>Sugestao da equipe:</strong> ${safeSuggestedSlot}</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `,
        text: [
            `Atualizacao do pedido #${budgetId}`,
            '',
            `Cliente: ${customerName || 'Cliente'}`,
            `Evento: ${eventName || 'Evento'}`,
            `Status: ${status || 'Atualizado'}`,
            '',
            statusCopy,
            ...(status === 'Cancelado' && cancelReason ? ['', `Motivo: ${cancelReason}`] : []),
            ...(status === 'Cancelado' && originalDate ? [`Horario original: ${[originalDate, originalTime].filter(Boolean).join(' às ')}`] : []),
            ...(status === 'Cancelado' && suggestedDate ? [`Sugestao: ${[suggestedDate, suggestedTime].filter(Boolean).join(' às ')}`] : []),
            '',
            `Total: ${total || 'R$ 0,00'}`
        ].join('\n')
    };
}

app.get('/api/health', async (_request, response) => {
    const appData = await readAppData().catch(() => ({}));
    response.json({
        ok: true,
        service: 'mobilier-server',
        updatedAt: appData.updatedAt || null
    });
});

app.get('/api/app-data', async (_request, response) => {
    try {
        const appData = await readAppData();
        response.json({ ok: true, data: appData });
    } catch (error) {
        console.error('Erro ao ler dados:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel ler os dados.' });
    }
});

app.post('/api/app-data', async (request, response) => {
    try {
        const currentData = await readAppData();
        const sanitized = sanitizeAppData(request.body || {});
        await writeAppData({
            ...currentData,
            ...sanitized
        });
        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel salvar os dados.' });
    }
});

app.post('/api/product-image', async (request, response) => {
    const { dataUrl } = request.body || {};

    if (!dataUrl) {
        response.status(400).json({ ok: false, message: 'Imagem nao informada.' });
        return;
    }

    try {
        const imageUrl = await saveBase64Image(dataUrl);
        response.json({ ok: true, imageUrl });
    } catch (error) {
        console.error('Erro ao salvar imagem do produto:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel salvar a imagem.' });
    }
});

app.post('/api/registration-email', async (request, response) => {
    const { name, email, phone, address, notes } = request.body || {};

    if (!name || !email) {
        response.status(400).json({ ok: false, message: 'Nome e e-mail sao obrigatorios.' });
        return;
    }

    try {
        const message = buildRegistrationEmail({ name, email, phone, address, notes });
        await sendEmailMessage({
            from: process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_USER,
            to: email,
            replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
            subject: message.subject,
            text: message.text,
            html: message.html
        });

        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao enviar e-mail de cadastro:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel enviar o e-mail no momento.' });
    }
});

app.post('/api/password-reset/request', async (request, response) => {
    const email = String(request.body?.email || '').trim().toLowerCase();

    if (!email) {
        response.status(400).json({ ok: false, message: 'Informe um e-mail valido.' });
        return;
    }

    try {
        const appData = await readAppData();
        const user = Array.isArray(appData.users) ? appData.users.find(item => String(item.email || '').toLowerCase() === email) : null;

        if (!user) {
            response.json({ ok: true });
            return;
        }

        const token = crypto.randomBytes(24).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await writeAppData(appData);

        const resetUrl = `${getPublicBaseUrl(request)}/?resetToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
        const message = buildPasswordResetEmail({ name: user.name || 'Cliente', resetUrl });
        await sendEmailMessage({
            from: process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_USER,
            to: email,
            replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
            subject: message.subject,
            text: message.text,
            html: message.html
        });

        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao gerar recuperacao de senha:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel enviar o e-mail de recuperacao.' });
    }
});

app.post('/api/admin-user-created-email', async (request, response) => {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const name = String(request.body?.name || '').trim();

    if (!email) {
        response.status(400).json({ ok: false, message: 'Informe um e-mail valido.' });
        return;
    }

    try {
        const appData = await readAppData();
        const user = Array.isArray(appData.users) ? appData.users.find(item => String(item.email || '').toLowerCase() === email) : null;

        if (!user) {
            response.status(404).json({ ok: false, message: 'Usuario nao encontrado para envio do e-mail.' });
            return;
        }

        const token = crypto.randomBytes(24).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await writeAppData(appData);

        const resetUrl = `${getPublicBaseUrl(request)}/?resetToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
        const message = buildAdminUserCreatedEmail({ name: name || user.name || 'Cliente', resetUrl, email });
        await sendEmailMessage({
            from: process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_USER,
            to: email,
            replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
            subject: message.subject,
            text: message.text,
            html: message.html
        });

        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao enviar e-mail de primeiro acesso:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel enviar o e-mail de primeiro acesso.' });
    }
});

app.post('/api/password-reset/confirm', async (request, response) => {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const token = String(request.body?.token || '').trim();
    const newPassword = String(request.body?.newPassword || '');
    const passwordValidationMessage = getPasswordValidationMessage(newPassword);

    if (!email || !token || !newPassword) {
        response.status(400).json({ ok: false, message: 'Dados invalidos para redefinir a senha.' });
        return;
    }

    if (passwordValidationMessage) {
        response.status(400).json({ ok: false, message: passwordValidationMessage });
        return;
    }

    try {
        const appData = await readAppData();
        const user = Array.isArray(appData.users)
            ? appData.users.find(item => String(item.email || '').toLowerCase() === email)
            : null;

        if (!user || user.resetToken !== token) {
            response.status(400).json({ ok: false, message: 'Link invalido ou expirado.' });
            return;
        }

        if (!user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt).getTime() < Date.now()) {
            response.status(400).json({ ok: false, message: 'Link expirado. Solicite uma nova recuperacao.' });
            return;
        }

        user.password = newPassword;
        delete user.resetToken;
        delete user.resetTokenExpiresAt;
        await writeAppData(appData);

        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao confirmar nova senha:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel atualizar a senha.' });
    }
});

app.post('/api/budget-email', async (request, response) => {
    const { email, customerName, budgetId, total, eventName, deliveryDate, deliveryTime, address, items } = request.body || {};

    if (!email || !budgetId) {
        response.status(400).json({ ok: false, message: 'Dados do orcamento incompletos.' });
        return;
    }

    try {
        const message = buildBudgetCreatedEmail({ customerName, budgetId, total, eventName, deliveryDate, deliveryTime, address, items });
        await sendEmailMessage({
            from: process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_USER,
            to: email,
            replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
            subject: message.subject,
            text: message.text,
            html: message.html
        });

        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao enviar e-mail de orcamento:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel enviar o e-mail do orcamento.' });
    }
});

app.post('/api/budget-status-email', async (request, response) => {
    const { email, customerName, budgetId, status, total, eventName, cancelReason, suggestedDate, suggestedTime, originalDate, originalTime } = request.body || {};

    if (!email || !budgetId || !status) {
        response.status(400).json({ ok: false, message: 'Dados da atualizacao incompletos.' });
        return;
    }

    try {
        const message = buildBudgetStatusEmail({ customerName, budgetId, status, total, eventName, cancelReason, suggestedDate, suggestedTime, originalDate, originalTime });
        await sendEmailMessage({
            from: process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.EMAIL_USER,
            to: email,
            replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
            subject: message.subject,
            text: message.text,
            html: message.html
        });

        response.json({ ok: true });
    } catch (error) {
        console.error('Erro ao enviar e-mail de status do orcamento:', error);
        response.status(500).json({ ok: false, message: 'Nao foi possivel enviar o e-mail de status.' });
    }
});

app.get('*', (_request, response) => {
    response.sendFile(path.join(projectRoot, 'index.html'));
});

app.listen(port, async () => {
    await ensureDataFile();
    console.log(`Servidor Mobilier ativo em http://localhost:${port}`);
});
