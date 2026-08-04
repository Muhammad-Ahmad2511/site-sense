import OpenAI from 'openai';

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateGroundedExplanation(audit) {
  if (!isAiConfigured()) {
    throw new Error('AI explanations are not configured on this server.');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const verified = audit.findings.map((item) => ({
    id: item.id,
    pageUrl: item.pageUrl,
    category: item.category,
    severity: item.severity,
    title: item.title,
    evidence: item.evidence,
    existingRecommendation: item.recommendation,
    confidence: item.confidence
  }));

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5-mini',
    store: false,
    instructions: [
      'You explain a website audit to a mixed technical and non-technical audience.',
      'Use only the supplied verified findings. Never add a finding, number, page, claim, cause, or statistic that is not present.',
      'Separate observed evidence from interpretation. When confidence is medium or low, preserve that uncertainty.',
      'Recommendations must reference only existing finding IDs and must remain editable suggestions, not claims of fact.'
    ].join(' '),
    input: JSON.stringify({
      auditedOrigin: audit.finalOrigin,
      score: audit.scores,
      verifiedFindings: verified,
      limitations: audit.limitations
    }),
    text: {
      format: {
        type: 'json_schema',
        name: 'grounded_audit_explanation',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['executiveSummary', 'priorityOrder', 'findingExplanations'],
          properties: {
            executiveSummary: { type: 'string' },
            priorityOrder: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['findingId', 'reason'],
                properties: {
                  findingId: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            },
            findingExplanations: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['findingId', 'explanation', 'refinedRecommendation'],
                properties: {
                  findingId: { type: 'string' },
                  explanation: { type: 'string' },
                  refinedRecommendation: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.output_text);
}
