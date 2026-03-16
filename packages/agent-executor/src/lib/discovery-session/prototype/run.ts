import { promptUser } from '../../chat-renderer/index.js';
import type { DiscoveryResult, StoryDefinition } from '../../plan-types.js';
import {
  buildModelRecommendation,
  IDiscoverySession,
  parseLayers,
  parseQuality,
  parseStoryTypes,
} from '../discovery-session.js';

export async function run(this: IDiscoverySession): Promise<DiscoveryResult> {
  const r = this._renderer;

  r.phaseHeader('discover');
  r.say('ba',
    'Hello! I\'m your Business Analyst and Scrum Master for this project. '
    + 'We\'ll work together through five question blocks to build a solid plan. '
    + 'No other agents are involved yet — this is just you and me.',
  );
  r.newline();
  r.say('ba', 'Let\'s start. Answer as freely as you like — I\'ll extract the structure.');
  r.newline();

  const answers: Record<string, string> = {};
  let currentBlock = '';

  for (const q of this._questions) {
    if (q.block !== currentBlock) {
      currentBlock = q.block;
      r.separator();
      r.say('system', `Block: ${currentBlock}`);
      r.separator();
      r.newline();
    }

    r.question('ba', q.text);
    if (q.hint) r.system(`Hint: ${q.hint}`);

    const answer = await promptUser(r, '');
    answers[q.id] = answer || '(skipped)';
    q.answered    = true;
    q.answer      = answers[q.id];

    if (answer && answer !== '(skipped)') {
      const ack = await this._acknowledgeAnswer(q.id, answer, answers);
      r.say('ba', ack);
    }
    r.newline();
  }

  const rawStories    = (answers['q-stories'] ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const storyTypeList = parseStoryTypes(answers['q-story-types'] ?? '');

  const stories: StoryDefinition[] = rawStories
    .filter((s) => s.toLowerCase() !== 'no' && s.toLowerCase() !== 'n')
    .map((title, i) => ({
      id:          `story-${i + 1}`,
      title,
      type:        storyTypeList[i] ?? 'feature',
      description: '',
    }));

  const grade             = parseQuality(answers['q-quality'] ?? 'B');
  const budgetSensitivity = (answers['q-budget'] ?? 'medium').toLowerCase().trim() as 'low' | 'medium' | 'high';
  const rec               = buildModelRecommendation(grade, budgetSensitivity);

  const result: DiscoveryResult = {
    projectName:           await this._extractProjectName(answers['q-problem'] ?? ''),
    problem:               answers['q-problem']      ?? '',
    primaryUser:           answers['q-user']         ?? '',
    successCriteria:       answers['q-success']      ?? '',
    stories,
    layers:                parseLayers(answers['q-layers'] ?? 'fullstack'),
    isGreenfield:          (answers['q-greenfield'] ?? '').toLowerCase().includes('green'),
    stackConstraints:      answers['q-stack']        ?? '',
    externalIntegrations:  answers['q-integrations'] ?? '',
    qualityGrade:          grade,
    timelinePressure:      (['low', 'medium', 'high'].includes((answers['q-timeline'] ?? '').toLowerCase())
                             ? answers['q-timeline']!.toLowerCase()
                             : 'medium') as 'low' | 'medium' | 'high',
    teamSize:              (['solo', 'small', 'large'].includes((answers['q-team'] ?? '').toLowerCase())
                             ? answers['q-team']!.toLowerCase()
                             : 'small') as 'solo' | 'small' | 'large',
    budgetSensitivity,
    openQuestions:         [],
    modelRecommendation:   rec,
    completedAt:           new Date().toISOString(),
  };

  const insights = await this._synthesizeInsights(result);
  if (insights) {
    r.newline();
    r.say('ba', insights);
  }

  r.newline();
  r.say('ba', 'Here is the model recommendation based on your quality grade and budget sensitivity:');
  r.modelRecommendation(rec);

  r.phaseSummary('discover', [
    `Project:  ${result.projectName}`,
    `Stories:  ${stories.length > 0 ? stories.map((s) => s.title).join(', ') : '(single story)'}`,
    `Layers:   ${result.layers.join(', ')}`,
    `Grade:    ${grade}`,
    `Timeline: ${result.timelinePressure}  ·  Team: ${result.teamSize}`,
  ]);

  this._save(result);
  return result;
}
