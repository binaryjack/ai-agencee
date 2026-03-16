import { IDiscoverySession, QUESTION_BANK } from '../discovery-session.js';

export async function _acknowledgeAnswer(
  this: IDiscoverySession,
  qId:        string,
  answer:     string,
  allAnswers: Record<string, string>,
): Promise<string> {
  if (this._modelRouter) {
    try {
      const questionText = QUESTION_BANK.find((q) => q.id === qId)?.text ?? qId;
      const ctx = Object.entries(allAnswers)
        .filter(([, v]) => v && v !== '(skipped)')
        .map(([k, v]) => `${k}: ${v.slice(0, 80)}`)
        .join('\n');
      const resp = await this._modelRouter.route('file-analysis', {
        messages: [
          {
            role:    'system',
            content: 'You are a Business Analyst conducting a project discovery interview. '
              + 'Respond with a single concise acknowledgement (1-2 sentences max). '
              + 'Show you understood the answer. Optionally note ONE brief concern or '
              + 'insight if relevant. Be conversational, not formal. No markdown.',
          },
          {
            role:    'user',
            content: `Question asked: ${questionText}\n`
              + `User answered: "${answer}"\n`
              + `Conversation so far:\n${ctx}\n\nAcknowledge in 1-2 sentences:`,
          },
        ],
        maxTokens: 120,
      });
      const text = resp.content.trim();
      if (text.length > 5) return text;
    } catch { /* fall through */ }
  }

  const short = answer.slice(0, 60) + (answer.length > 60 ? '…' : '');
  switch (qId) {
    case 'q-problem':  return `Understood — "${short}". Good problem statement.`;
    case 'q-user':     return `Got it. Primary user: ${short}.`;
    case 'q-success':  return 'Good success criteria. I\'ll align agents to that.';
    case 'q-stories':  return `I see ${answer.split('\n').filter(Boolean).length} potential story line(s).`;
    case 'q-quality':  return 'Quality grade noted. This shapes the model recommendations.';
    case 'q-stack':    return answer.toLowerCase().includes('no constrain')
                             ? 'No constraints — agents will make optimal choices.'
                             : `Stack: ${short}. Noted.`;
    default:           return 'Noted.';
  }
}
