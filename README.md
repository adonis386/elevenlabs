## WhatsApp AI Agent (Twilio + ElevenLabs) — MVP

This project is a minimal webhook for **Twilio WhatsApp** deployed on **Vercel**.

### Endpoint

- `POST /api/twilio/whatsapp`
  - Accepts Twilio's incoming message webhook (`application/x-www-form-urlencoded`)
  - Optionally validates `X-Twilio-Signature` if `TWILIO_AUTH_TOKEN` is set
  - Returns TwiML immediately (MVP)

### Local setup

1) Install deps

```bash
npm i
```

2) Create `.env.local` from `.env.example` and fill values:

```bash
cp .env.example .env.local
```

3) Run dev server

```bash
npm run dev
```

### Connect Twilio WhatsApp webhook

In the Twilio Console for your WhatsApp sender, configure the **incoming message webhook** to:

- Local (with a tunnel like ngrok): `https://<your-tunnel>/api/twilio/whatsapp`
- Vercel: `https://<your-app>.vercel.app/api/twilio/whatsapp`

### Next steps (we’ll implement next)

- Call ElevenLabs TTS and generate an audio response
- Host the generated audio (or use a storage provider) and reply via Twilio REST API with media
- Add robust signature validation using the exact public URL (Vercel headers)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
