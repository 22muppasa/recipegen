# preprocess_recipes.py
import re
import csv
from ast import literal_eval
from datasets import load_dataset

# --- CONFIG ---
HF_DATASET = "untitledwebsite123/food-recipes"
DATA_FILE  = "recipes.csv"          # inside the dataset repo
SPLIT      = "train"
OUT_CSV_ING = "processed_recipes.csv"
OUT_CSV_LOOKUP = "recipes_lookup.csv"

# --- Helpers ---
_r_list_re = re.compile(r'^\s*c\((.*)\)\s*$', re.DOTALL)

def parse_r_list_string(val):
    """
    Accepts:
      - R-like: c("a","b") or c('a','b')
      - JSON-like lists: '["a","b"]'
      - Already-parsed Python lists
      - None/NaN/empty strings
    Returns a Python list[str].
    """
    if val is None:
        return []

    if isinstance(val, list):
        return [str(x) for x in val]

    if isinstance(val, str):
        s = val.strip()
        if not s:
            return []

        m = _r_list_re.match(s)
        if m:
            content = m.group(1)
            items = re.findall(r'"([^"]*)"|\'([^\']*)\'', content)
            return [x for tup in items for x in tup if x]

        if s.startswith('[') and s.endswith(']'):
            try:
                parsed = literal_eval(s)
                if isinstance(parsed, list):
                    return [str(x) for x in parsed]
            except Exception:
                pass

    return [str(val)]

def clean_ingredient(ing):
    return str(ing).strip().lower()

def normalize_instructions(raw):
    """
    Normalize instructions into a single string with numbered steps.
    Handles list-like values (R c(), JSON, Python list) or plain strings.
    """
    steps = parse_r_list_string(raw)
    # If parse fell back to a single giant string, split on common delimiters
    if len(steps) == 1 and ("\n" in steps[0] or "." in steps[0]):
        blob = steps[0]
        # try splitting by newlines first, then fallback to period
        chunks = [line.strip() for line in blob.split("\n") if line.strip()]
        if len(chunks) < 2:
            chunks = [p.strip() for p in blob.split(".") if p.strip()]
        steps = chunks
    steps = [s.strip() for s in steps if s and s.strip()]
    if not steps:
        return ""
    return "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))

# --- Stream + write incrementally ---
ds = load_dataset(HF_DATASET, data_files=DATA_FILE, streaming=True, split=SPLIT)

# Open both CSVs and write headers
with open(OUT_CSV_ING, "w", newline="", encoding="utf-8") as f_ing, \
     open(OUT_CSV_LOOKUP, "w", newline="", encoding="utf-8") as f_lu:

    w_ing = csv.writer(f_ing)
    w_lu  = csv.writer(f_lu)

    # processed ingredients file (for vectorization/recs)
    w_ing.writerow([
        "RecipeId",
        "Name",
        "CleanedIngredients",
        "Calories",
        "ProteinContent",
        "FatContent",
        "CarbohydrateContent",
    ])

    # lookup file (for fetching instructions + recipe info)
    w_lu.writerow([
        "RecipeId",
        "Name",
        "Instructions",
        "Description",
        "RecipeCategory",
        "RecipeCuisine",
        "TotalTime",
        "PrepTime",
        "CookTime",
        "RecipeServings",
        "Calories",
        "ProteinContent",
        "FatContent",
        "CarbohydrateContent",
        "Keywords",
        "RecipeUrl",
    ])

    for i, row in enumerate(ds):
        # Common fields
        recipe_id = row.get("RecipeId")
        name      = row.get("Name")

        # ---- Ingredients (cleaned) ----
        raw_parts = row.get("RecipeIngredientParts")
        parts = parse_r_list_string(raw_parts)
        cleaned = [clean_ingredient(x) for x in parts]

        calories = row.get("Calories")
        protein  = row.get("ProteinContent")
        fat      = row.get("FatContent")
        carbs    = row.get("CarbohydrateContent")

        # Write to processed ingredients CSV
        w_ing.writerow([
            recipe_id,
            name,
            str(cleaned),
            calories,
            protein,
            fat,
            carbs,
        ])

        # ---- Instructions & metadata for lookup ----
        instructions = normalize_instructions(row.get("RecipeInstructions"))
        description  = row.get("Description")
        category     = row.get("RecipeCategory")
        cuisine      = row.get("RecipeCuisine")
        tot_time     = row.get("TotalTime")
        prep_time    = row.get("PrepTime")
        cook_time    = row.get("CookTime")
        servings     = row.get("RecipeServings")
        keywords     = row.get("Keywords")
        url          = row.get("RecipeUrl") or row.get("URL") or row.get("Url")

        w_lu.writerow([
            recipe_id,
            name,
            instructions,
            description,
            category,
            cuisine,
            tot_time,
            prep_time,
            cook_time,
            servings,
            calories,
            protein,
            fat,
            carbs,
            keywords,
            url,
        ])

        if (i + 1) % 50000 == 0:
            print(f"Processed {i+1} rows...")

print(f"✅ Done. Saved {OUT_CSV_ING} and {OUT_CSV_LOOKUP}.")
