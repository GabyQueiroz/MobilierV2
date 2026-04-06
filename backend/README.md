# Mobilier Server

Backend unico para:

- servir o site publicamente
- guardar os dados compartilhados do sistema
- enviar e-mail de cadastro com seguranca

## Configuracao

1. Copie `.env.example` para `.env`
2. Preencha `EMAIL_USER` e `EMAIL_APP_PASSWORD`
3. Ajuste `ALLOWED_ORIGINS` com seu dominio publico se necessario

## Execucao

```powershell
cd backend
npm install
npm start
```

Servidor padrao: `http://localhost:3001`

O proprio backend ja entrega o frontend, entao depois de subir basta abrir:

- `http://localhost:3001`

Health check:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

## Publicacao

Publique esta pasta `backend` como um servico Node.js.

Na publicacao:

1. defina as variaveis do `.env`
2. use `npm install`
3. use `npm start`
4. acesse a URL publica do servico

Como o backend entrega o site e a API no mesmo dominio, o frontend ja passa a funcionar para o publico sem depender de `localhost`.
