'use server';

import { db } from '@/drizzle/db';
import { courseTable } from '@/drizzle/schema';
import { GoogleGenAI } from '@google/genai';

type ActionProps = {
  prompt: String;
  includeCourseInfo?: boolean;
};

export async function CallAiAction(context: ActionProps) {
  let prompt = context.prompt.toString();
  if (context.includeCourseInfo) {
    const courseData = await db
      .select({
        courseName: courseTable.title,
        courseSubTitle: courseTable.subTitle,
        courseCategory: courseTable.courseCategory,
        difficulty: courseTable.difficultyLevel,
        duration: courseTable.courseDuration,
        prerequisits: courseTable.prerequisites,
        coursePrice: courseTable.courseCategory,
      })
      .from(courseTable);

    prompt += 'Context course info: \n\n';
    prompt += JSON.stringify(courseData);
  }
  const ai = new GoogleGenAI({});
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: `
You are an AI tutor in a Learning Management System.
Help users learn, find course info, and understand topics.
Explain clearly but never give direct answers to graded work.
Be friendly, concise, and encouraging.
If unsure or out of scope, suggest asking human support.
    `,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  return response.text ?? '';
}
