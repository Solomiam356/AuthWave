import { NextResponse } from "next/server";
import { OpenAI } from "openai";

interface DailyMealPlan {
  Breakfast?: string;
  Lunch?: string;
  Dinner?: string;
  Snacks?: string;
}

interface WeeklyMealPlan {
  [day: string]: DailyMealPlan;
}

// Запасний план на випадок помилки ШІ (429 або 404)
const fallbackMealPlan: WeeklyMealPlan = {
  "Monday": {
    "Breakfast": "Вівсянка з ягодами (Запасний варіант) - 350 kcal",
    "Lunch": "Салат з куркою - 500 kcal",
    "Dinner": "Риба з овочами - 450 kcal",
    "Snacks": "Горіхи - 150 kcal"
  }
};

const openai = new OpenAI({
  baseURL: "google/gemini-2.0-flash-exp:free",
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "My Meal Plan App",
  }
});

export async function POST(request: Request) {
  try {
    const { dietType, calories, allergies, cuisine, snacks } = await request.json();

    const prompt = `
      Create a 7-day meal plan for a ${dietType} diet aiming for ${calories} calories.
      Allergies: ${allergies || "none"}.
      Cuisine: ${cuisine || "any"}.
      Structure as valid JSON object only.
    `;

    try {
      const response = await openai.chat.completions.create({
        // ЗМІНЕНО: Більш стабільна модель
        model: "google/gemini-flash-1.5-8b", 
        messages: [
          { role: "system", content: "You are a professional nutritionist that outputs ONLY JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      });

      const aiContent = response.choices[0]?.message?.content?.trim();
      
      if (!aiContent) throw new Error("Empty AI response");

      const cleanJsonString = aiContent.replace(/```json|```/g, "").trim();
      const parsedMealPlan = JSON.parse(cleanJsonString);

      return NextResponse.json({ mealPlan: parsedMealPlan });

    } catch (aiError: any) {
      console.error("AI Service Error (using fallback):", aiError.message);
      // Якщо ШІ видав 429 або 404, повертаємо запасний план, щоб сторінка не ламалася
      return NextResponse.json({ 
        mealPlan: fallbackMealPlan, 
        warning: "Використано тестовий план через перевантаження сервера ШІ." 
      });
    }

  } catch (error) {
    console.error("Critical Error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}