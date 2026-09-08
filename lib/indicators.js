export const INDICATORS = [
  { key: "c01", slug: "population", title: "Population & households", description: "Household, population and sex ratio", mapField: "c_01_population_including_floating_population_total", format: "count" },
  { key: "c02", slug: "age", title: "Age", description: "Population by age group", mapField: "c_02_total", format: "count" },
  { key: "c03", slug: "religion", title: "Religion", description: "Population by religion", mapField: "c_03_total", format: "count" },
  { key: "c04", slug: "marital-status", title: "Marital status", description: "Marital status of population aged 10 years and above", mapField: "c_04_total", format: "count" },
  { key: "c05", slug: "literacy", title: "Literacy", description: "Literacy rate by age and sex", mapField: "c_05_7_years_and_above_total", format: "percent" },
  { key: "c06", slug: "education", title: "Education", description: "Field of education and highest level attained", mapField: "c_06_population_number", format: "count" },
  { key: "c07", slug: "students", title: "Students", description: "Currently studying population aged 5–29 years", mapField: "c_07_total_male", format: "count" },
  { key: "c08", slug: "employment-status", title: "Employment status", description: "Working status of population aged 5 years and above", mapField: "c_08_population_total", format: "count" },
  { key: "c09", slug: "employment-sector", title: "Employment sector", description: "Employed population by sector", mapField: "c_09_total", format: "count" },
  { key: "c10", slug: "youth-neet", title: "Youth NEET", description: "Population aged 15–24 years not in education, employment or training", mapField: "c_10_total", format: "count" },
  { key: "c11", slug: "mobile-internet", title: "Mobile & internet", description: "Mobile phone ownership and internet use", mapField: "c_11_5_years_and_above_total", format: "percent" },
  { key: "c12", slug: "financial-inclusion", title: "Financial inclusion", description: "Financial institution and mobile banking accounts", mapField: "c_12_having_account_in_financial_institution_bank_insurance_micro_credit_post_office_etc_total", format: "percent" },
  { key: "c13", slug: "ethnic-population", title: "Ethnic population", description: "Ethnic population by major group", mapField: "c_13_ethnic_population_total", format: "count" },
  { key: "c14", slug: "housing-structure", title: "Housing structure", description: "Dwelling structure and ownership status", mapField: "c_14_general_household", format: "count" },
  { key: "c15", slug: "drinking-water", title: "Drinking water", description: "Main source of drinking water", mapField: "c_15_general_household", format: "count" },
  { key: "c16", slug: "toilet-facilities", title: "Toilet facilities", description: "Toilet facilities", mapField: "c_16_general_household", format: "count" },
  { key: "c17", slug: "cooking-fuel-electricity", title: "Cooking fuel & electricity", description: "Cooking fuel and electricity coverage", mapField: "c_17_general_household", format: "count" },
  { key: "c18", slug: "household-size", title: "Household size", description: "Household composition and average household size", mapField: "c_18_average_household_size", format: "number" },
  { key: "sdg", slug: "sdg", title: "SDG indicators", description: "Selected Sustainable Development Goal indicators", mapField: "sdg_indicator_by_union_participation_in_organized_learning_4_2_2_total", format: "percent" }
];

export const INDICATOR_BY_SLUG = Object.fromEntries(INDICATORS.map((item) => [item.slug, item]));

export const LEVEL_ORDER = {
  district: 1,
  city_corporation: 2,
  upazila: 2,
  support: 2,
  union: 3,
  ward: 3,
  paurashava: 3,
  mauza_village: 4,
};

export function humanizeField(field) {
  let label = field
    .replace(/^c_\d+_/, "")
    .replace(/^sdg_indicator_by_union_/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  label = label.replace(/\bmale_\d+\b/g, "male").replace(/\bfemale_\d+\b/g, "female");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatValue(value, format = "number") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (format === "percent") return `${n.toFixed(2)}%`;
  if (format === "count") return Math.round(n).toLocaleString("en-US");
  if (format === "number") return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(value);
}
