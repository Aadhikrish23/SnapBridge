import { PipelineContext } from 'shared';
import { PipelineStep } from './PipelineStep';

/**
 * Buffered image processing pipeline using a middleware-style chain.
 *
 * The upload body is fully read into memory (buffered) before processing.
 * For our 15 MB upload limit, this is acceptable and simpler than true
 * streaming. Each step receives the full buffer via `context.imageBuffer`.
 *
 * Middleware termination:
 * - A step can **stop the chain** by throwing an error. The error propagates
 *   to the caller and no subsequent steps execute.
 * - A step can **stop the chain** by simply not calling `next()`. Execution
 *   ends silently after the current step completes.
 */
export class ImagePipeline {
  private steps: PipelineStep[] = [];

  /**
   * Registers a processing step in the pipeline.
   */
  public use(step: PipelineStep): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Executes the composed middleware steps recursively.
   * If a step throws, the error propagates immediately.
   * If a step omits `await next()`, subsequent steps are skipped.
   */
  public async execute(context: PipelineContext): Promise<void> {
    if (this.steps.length === 0) return;

    const executeStep = async (index: number): Promise<void> => {
      if (index >= this.steps.length) return;
      const step = this.steps[index];
      await step.execute(context, () => executeStep(index + 1));
    };

    await executeStep(0);
  }
}

