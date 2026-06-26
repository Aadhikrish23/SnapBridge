import { PipelineContext } from 'shared';

export interface PipelineStep {
  readonly name: string;
  
  /**
   * Executes the pipeline step's custom logic.
   * Calls `await next()` to forward control to the subsequent step in the middleware chain.
   */
  execute(context: PipelineContext, next: () => Promise<void>): Promise<void>;
}
