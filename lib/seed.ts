import type { ConditionMapping, TestReference } from "@/lib/types";

export const testReferences: TestReference[] = [
  { testName: "Hemoglobin", aliases: ["hb"], unit: "g/dL", normalMin: 13, normalMax: 17 },
  { testName: "Glucose (Fasting)", aliases: ["fbs", "fasting blood sugar", "glucose fasting"], unit: "mg/dL", normalMin: 70, normalMax: 100 },
  { testName: "Total Cholesterol", aliases: ["cholesterol", "cholesterol total"], unit: "mg/dL", normalMin: 0, normalMax: 200 },
  { testName: "WBC Count", aliases: ["white blood cell count", "total leucocyte count", "tlc"], unit: "/uL", normalMin: 4000, normalMax: 11000 },
  { testName: "Creatinine", aliases: ["serum creatinine"], unit: "mg/dL", normalMin: 0.6, normalMax: 1.3 },
  { testName: "Platelet Count", aliases: ["platelets"], unit: "/uL", normalMin: 150000, normalMax: 450000 },
  { testName: "TSH", aliases: ["thyroid stimulating hormone"], unit: "mIU/L", normalMin: 0.4, normalMax: 4 },
  { testName: "Vitamin D", aliases: ["25-oh vitamin d", "vitamin d3"], unit: "ng/mL", normalMin: 30, normalMax: 100 },
];

export const conditionMappings: ConditionMapping[] = [
  {
    testName: "Glucose (Fasting)", direction: "high",
    conditionName: "Elevated Blood Sugar (Possible Pre-Diabetes/Diabetes)",
    description: "Fasting glucose above the normal range can indicate insulin resistance or diabetes.",
    dietAdvice: "Reduce refined sugar and white rice or maida. Prefer whole grains, vegetables, legumes, and smaller balanced meals.",
    exerciseAdvice: "Aim for 30 minutes of brisk walking or cycling five days a week. Short post-meal walks may help reduce glucose spikes.",
    medicines: ["Metformin"], consultSpecialty: "Endocrinologist",
    severityNote: "Confirm with HbA1c and a doctor's evaluation.",
  },
  {
    testName: "Hemoglobin", direction: "low", conditionName: "Anemia (Low Hemoglobin)",
    description: "Low hemoglobin may indicate iron-deficiency anemia or another underlying cause.",
    dietAdvice: "Include iron-rich foods such as lentils, leafy greens, meat, and fortified foods. Pair plant iron with vitamin C.",
    exerciseAdvice: "Choose light-to-moderate activity and avoid overexertion until the cause and severity are assessed.",
    medicines: ["Iron supplements", "Folic acid"], consultSpecialty: "General Physician",
  },
  {
    testName: "Total Cholesterol", direction: "high", conditionName: "High Cholesterol",
    description: "Elevated cholesterol can increase long-term cardiovascular risk.",
    dietAdvice: "Reduce fried food and saturated fat. Add oats, nuts, legumes, fruit, and vegetables.",
    exerciseAdvice: "When medically safe, aim for 150 minutes of moderate cardio each week.",
    medicines: ["Statins (e.g. Atorvastatin)"], consultSpecialty: "Cardiologist",
  },
  {
    testName: "WBC Count", direction: "high", conditionName: "Elevated White Blood Cell Count",
    description: "A high white-cell count can occur with infection, inflammation, stress, or other conditions.",
    dietAdvice: "Stay hydrated and eat regular balanced meals while the underlying cause is assessed.",
    exerciseAdvice: "Prioritize rest if you feel unwell and avoid intense exercise until a clinician reviews the result.",
    medicines: [], consultSpecialty: "General Physician",
  },
  {
    testName: "Creatinine", direction: "high", conditionName: "Elevated Creatinine (Possible Kidney Function Concern)",
    description: "Higher creatinine can be associated with reduced kidney filtration, dehydration, medicines, or muscle factors.",
    dietAdvice: "Avoid making major protein, fluid, or salt changes until a clinician evaluates kidney function.",
    exerciseAdvice: "Choose light activity and avoid dehydration-heavy workouts before medical review.",
    medicines: [], consultSpecialty: "Nephrologist",
  },
  {
    testName: "TSH", direction: "high", conditionName: "Possible Hypothyroidism",
    description: "High TSH can be associated with an underactive thyroid and should be interpreted with thyroid hormone results.",
    dietAdvice: "Use iodized salt in normal amounts and maintain a varied diet; avoid starting iodine supplements without advice.",
    exerciseAdvice: "Begin with moderate aerobic exercise three or four times weekly as energy and health allow.",
    medicines: ["Levothyroxine"], consultSpecialty: "Endocrinologist",
  },
  {
    testName: "Vitamin D", direction: "low", conditionName: "Vitamin D Deficiency",
    description: "Low vitamin D may affect bone and muscle health.",
    dietAdvice: "Include fortified foods, eggs, and fatty fish where appropriate. Discuss safe sunlight exposure with a clinician.",
    exerciseAdvice: "Weight-bearing activity such as walking and suitable resistance training can support bone health.",
    medicines: ["Vitamin D3 supplements (cholecalciferol)"], consultSpecialty: "General Physician",
  },
];

export const generalRecommendation = {
  dietAdvice: "Maintain a balanced diet with vegetables, fruit, whole grains, and lean protein. Limit heavily processed foods, added sugar, and excess salt, and stay adequately hydrated.",
  exerciseAdvice: "When medically safe, aim for at least 150 minutes of moderate activity per week plus two days of strength training.",
};
