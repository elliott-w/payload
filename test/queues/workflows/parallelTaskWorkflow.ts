import type { WorkflowConfig } from 'payload'

export const parallelTaskWorkflow: WorkflowConfig<'parallelTask'> = {
  slug: 'parallelTask',
  inputSchema: [
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
  ],
  handler: async ({ job, inlineTask }) => {
    const taskIDs = Array.from({ length: job.input.amount }, (_, i) => i + 1).map((i) =>
      i.toString(),
    )

    await Promise.all(
      taskIDs.map(async (taskID) => {
        return await inlineTask(`parallel task ${taskID}`, {
          task: async ({ req }) => {
            const newSimple = await req.payload.db.create({
              collection: 'simple',
              data: {
                title: 'parallel task ' + taskID,
              },
            })
            return {
              output: {
                simpleID: newSimple.id,
              },
            }
          },
        })
      }),
    )
  },
}
