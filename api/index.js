// Explicit Vercel Serverless Function entrypoint.
// All /api/v1/* and /health requests are rewritten here by vercel.json.
import app from '../src/index.js';
export default app;
