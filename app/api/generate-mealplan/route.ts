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

// Fixed to 100% English
const fallbackMealPlan: WeeklyMealPlan = {
  "Monday": {
    "Breakfast": "Oatmeal with berries (Fallback option) - 350 kcal",
    "Lunch": "Chicken salad - 500 kcal",
    "Dinner": "Fish with steamed vegetables - 450 kcal",
    "Snacks": "Mixed nuts - 150 kcal"
  }
};

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "My Meal Plan App",
  }
});

export async function POST(request: Request) {
  try {
    const { dietType, calories, allergies, cuisine } = await request.json();

    // Added "Output in English only" to the prompt
    const prompt = `
      Create a 7-day meal plan for a ${dietType} diet aiming for ${calories} calories.
      Allergies: ${allergies || "none"}.
      Cuisine: ${cuisine || "any"}.
      
      IMPORTANT: All meal names and descriptions must be in ENGLISH only.
      Return ONLY a valid JSON object. 
      The keys must be days of the week: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday".
      Each day must have: "Breakfast", "Lunch", "Dinner", "Snacks".
      Example format:
      {
        "Monday": { "Breakfast": "...", "Lunch": "...", "Dinner": "...", "Snacks": "..." },
        ...
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-oss-120b", 
        messages: [
          { role: "system", content: "You are a professional nutritionist. Output ONLY raw JSON in English. No other languages allowed." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      });

      const aiContent = response.choices[0]?.message?.content?.trim() || "";
      
      console.log("--- DEBUG: RAW AI RESPONSE START ---");
      console.log(aiContent);
      console.log("--- DEBUG: RAW AI RESPONSE END ---");

      let cleanJsonString = aiContent.replace(/```json/g, "").replace(/```/g, "").trim();

      const jsonStart = cleanJsonString.indexOf('{');
      const jsonEnd = cleanJsonString.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanJsonString = cleanJsonString.substring(jsonStart, jsonEnd + 1);
      }

      const parsedMealPlan = JSON.parse(cleanJsonString);
      const finalPlan = parsedMealPlan.mealPlan || parsedMealPlan;

      return NextResponse.json({ mealPlan: finalPlan });

    } catch (aiError: any) {
      console.error("AI Service Error:", aiError.message);
      return NextResponse.json({ 
        mealPlan: fallbackMealPlan,
        warning: "Used fallback plan due to AI formatting error." 
      });
    }

  } catch (error) {
    console.error("Critical Route Error:", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}