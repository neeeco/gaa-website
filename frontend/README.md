# GAA Results & Fixtures

A modern web application for viewing GAA (Gaelic Athletic Association) match results and fixtures.

🌐 **Live Site**: [https://gaa.vercel.app/](https://gaa.vercel.app/)

<!-- Updated: Domain renamed from gaa-website to gaa -->

## Features

- ✅ Latest match results with intelligent fallback system
- ✅ Upcoming fixtures (next 2 weeks)
- ✅ All-Ireland Senior Football Championship group tables
- ✅ Sport-specific filtering (Football & Hurling)
- ✅ Professional SVG county logos
- ✅ Responsive design optimized for all devices
- ✅ Real-time data from Railway backend

## Technology Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel
- **Backend**: Railway (Express.js + Playwright scraper)
- **Database**: SQLite with 180-day retention

## Getting Started

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

The application automatically connects to the production API when deployed. For local development, it falls back to `http://localhost:3001`.

## Deployment

The application is automatically deployed to Vercel at [https://gaa.vercel.app/](https://gaa.vercel.app/) when changes are pushed to the main branch.

## Project Structure

```
frontend/
├── src/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # Reusable React components
│   ├── services/     # API service functions
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
└── package.json      # Dependencies and scripts
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
