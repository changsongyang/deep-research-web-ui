import { streamText } from 'ai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

import { systemPrompt } from './prompt'
import { useAiModel } from '~/composables/useAiProvider'

type PartialFeedback = DeepPartial<z.infer<typeof feedbackTypeSchema>>

export const feedbackTypeSchema = z.object({
  questions: z.array(z.string()),
})

export function generateFeedback({
  query,
  numQuestions = 3,
}: {
  query: string
  numQuestions?: number
}) {
  const schema = z.object({
    questions: z
      .array(z.string())
      .describe(
        `Follow up questions to clarify the research direction, max of ${numQuestions}`,
      ),
  })
  const jsonSchema = JSON.stringify(zodToJsonSchema(schema))
  const prompt = [
    `Given the following query from the user, ask some follow up questions to clarify the research direction. Return a maximum of ${numQuestions} questions, but feel free to return less if the original query is clear: <query>${query}</query>`,
    `You MUST respond in JSON with the following schema: ${jsonSchema}`,
  ].join('\n\n')

  const stream = streamText({
    model: useAiModel(),
    system: systemPrompt(),
    prompt,
  })

  return parseStreamingJson(
    stream.textStream,
    feedbackTypeSchema,
    (value: PartialFeedback) => !!value.questions && value.questions.length > 0,
  )
}
