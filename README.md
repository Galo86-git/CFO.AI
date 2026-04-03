# CFO.AI — Demo

## Estructura del proyecto

```
/
├── api/
│   └── claude.js        ← función serverless (proxy seguro a Claude API)
├── public/
│   ├── index.html       ← landing page
│   └── demo.html        ← demo funcional
└── vercel.json          ← configuración Vercel
```

## Deploy en Vercel

### 1. Subir a GitHub
Subí todos estos archivos a tu repo `Galo_Comunidad`.

### 2. Configurar la API key en Vercel
1. Ir a vercel.com → tu proyecto → **Settings → Environment Variables**
2. Agregar variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-tu-key-aqui`
   - **Environment:** Production + Preview + Development
3. Click **Save**

### 3. Redeploy
Vercel redespliega automático cuando subís cambios a GitHub.

## Por qué esta arquitectura es segura

- La API key **nunca aparece en el HTML** — está guardada en variables de entorno de Vercel
- El browser llama a `/api/claude` (tu servidor) — nunca directamente a Anthropic
- Solo vos podés ver la key en el panel de Vercel

## URLs finales

- Landing: `https://galo-comunidad.vercel.app`
- Demo: `https://galo-comunidad.vercel.app/demo.html`
- API: `https://galo-comunidad.vercel.app/api/claude` (solo POST)
