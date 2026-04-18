# AI Classification Activation Guide

Use this guide to activate AI auto-classification in production.

## Step 1 — Choose provider and set Render environment variables

- Gemini 2.5 Flash:
  - `AI_PROVIDER=google`
  - `AI_MODEL=gemini-2.5-flash`
- Claude Haiku:
  - `AI_PROVIDER=anthropic`
  - `AI_MODEL=claude-haiku-4-5`
- GPT-4o Mini:
  - `AI_PROVIDER=openai`
  - `AI_MODEL=gpt-4o-mini`

## Step 2 — Set API key and redeploy

Set `AI_API_KEY` in the Render dashboard, then redeploy.

## Step 3 — New submissions are classified at recording time

Once active, all new submissions (patient + staff) are classified during incident recording.
`auto_classification` and `auto_event_type` are written into `ai_metadata` before save.

## Step 4 — Backfill existing records

Run `POST /ai/classify/batch` (requires `top_management` authorization) to generate classifications for existing incidents.

## Step 5 — Quality Admin review experience

Quality Admin users will see AI Suggested badges on all classified incidents.

## Step 6 — Feedback becomes training data

Each Accept/Override action writes feedback into `ai_metadata.feedback`. This becomes your training dataset.

## Note

`ai_metadata.auto_classification` is `null` for incidents submitted while `AI_PROVIDER=none`.  
This is expected behavior and not an error.
