import type { IChatRenderer } from '../chat-renderer.js';
import { bold, c, dim } from '../chat-renderer.js';

export function modelRecommendation(
  this: IChatRenderer,
  rec: {
    discovery:           string;
    planning:            string;
    implementation:      string;
    review:              string;
    estimatedCostNote:   string;
  },
): void {
  this.separator('-');
  console.log(`  ${bold(c('cyan', '?? Model Recommendation (cost guidance)'))}`);
  console.log(`  ${dim('Discovery / Planning')}   ? ${c('green', rec.discovery)}`);
  console.log(`  ${dim('Architecture / Design')}  ? ${c('yellow', rec.planning)}`);
  console.log(`  ${dim('Implementation')}         ? ${c('cyan', rec.implementation)}`);
  console.log(`  ${dim('Review / Audit')}         ? ${c('green', rec.review)}`);
  console.log(`  ${dim(rec.estimatedCostNote)}`);
  this.separator('-');
  console.log('');
}
