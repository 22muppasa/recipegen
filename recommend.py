# recommend_recipes.py
import os
import ast
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from joblib import dump, load

# ---------- Paths ----------
CSV_ING_PATH   = "processed_recipes.csv"  # from preprocess step
CSV_LOOKUP_PATH= "recipes_lookup.csv"     # from preprocess step
VEC_PATH       = "tfidf_vectorizer.joblib"
MATRIX_PATH    = "tfidf_matrix.joblib"
DF_PATH        = "recipes_df.joblib"

# ---------- Load data (ingredients) ----------
usecols = ["RecipeId","Name","CleanedIngredients"]
df = pd.read_csv(CSV_ING_PATH, usecols=usecols)

def safe_list_eval(s):
    try:
        v = ast.literal_eval(s)
        return v if isinstance(v, list) else []
    except Exception:
        return []

df["CleanedIngredients"] = df["CleanedIngredients"].apply(safe_list_eval)
df["IngredientsString"] = df["CleanedIngredients"].apply(lambda x: " ".join(x))

# ---------- Load lookup table for instructions/metadata ----------
df_lookup = pd.read_csv(CSV_LOOKUP_PATH)

# Map RecipeId -> row (for O(1) retrieval)
lookup_by_id = {row["RecipeId"]: row for _, row in df_lookup.iterrows()}

# ---------- Vectorizer + Matrix (cache if available) ----------
if os.path.exists(VEC_PATH) and os.path.exists(MATRIX_PATH) and os.path.exists(DF_PATH):
    tfidf_vectorizer = load(VEC_PATH)
    tfidf_matrix     = load(MATRIX_PATH)
    df               = load(DF_PATH)
else:
    tfidf_vectorizer = TfidfVectorizer(
        preprocessor=None,
        tokenizer=str.split,
        lowercase=False,
        dtype=np.float32,
        min_df=2,
        max_features=50000,
        ngram_range=(1, 1)
    )
    tfidf_matrix = tfidf_vectorizer.fit_transform(df["IngredientsString"])
    dump(tfidf_vectorizer, VEC_PATH)
    dump(tfidf_matrix, MATRIX_PATH)
    dump(df, DF_PATH)

def get_recommendations(ingredients_list, top_n=4):
    """
    Returns list of top_n dicts with keys:
      RecipeId, Name, SimilarityScore
    """
    cleaned = [str(ing).strip().lower() for ing in ingredients_list if str(ing).strip()]
    if not cleaned:
        return []

    q = " ".join(cleaned)
    q_vec = tfidf_vectorizer.transform([q])          # 1 x V
    scores = (tfidf_matrix @ q_vec.T).toarray().ravel()  # (N,)

    if top_n >= len(scores):
        top_idx = np.argsort(scores)[::-1]
    else:
        part = np.argpartition(scores, -top_n)[-top_n:]
        top_idx = part[np.argsort(scores[part])[::-1]]

    out = []
    for idx in top_idx:
        out.append({
            "RecipeId": df.iloc[idx]["RecipeId"],
            "Name": df.iloc[idx]["Name"],
            "SimilarityScore": float(scores[idx])
        })
    return out

def present_choices(recs):
    """
    Prints A/B/C/D style list. Returns the same list, but
    each item enriched with 'choice' = 'A'|'B'|'C'|'D'.
    """
    labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    enriched = []
    print("\nWhich recipe do you want? Choose A, B, C, or D.\n")
    for i, r in enumerate(recs):
        tag = labels[i]
        enriched.append({**r, "choice": tag})
        print(f"{tag}) {r['Name']}  (ID: {r['RecipeId']}, score: {r['SimilarityScore']:.3f})")
    return enriched

def show_recipe_for_choice(choice_letter, choice_list):
    """
    Given a letter like 'A'/'B'/'C'/'D' and the choice list from present_choices,
    fetch the full recipe (instructions + metadata) from recipes_lookup.csv and print it.
    """
    if not choice_list:
        print("No recommendations to choose from.")
        return

    choice_letter = str(choice_letter).strip().upper()
    pick = next((x for x in choice_list if x["choice"] == choice_letter), None)
    if not pick:
        print(f"Invalid choice '{choice_letter}'.")
        return

    rid = pick["RecipeId"]
    info = lookup_by_id.get(rid)
    if info is None:
        print(f"Recipe details not found for RecipeId={rid}.")
        return

    # Pretty print
    def safe(v): 
        return "" if (pd.isna(v) if hasattr(pd, "isna") else v is None) else v

    print("\n" + "="*60)
    print(f"{safe(info['Name'])}  (RecipeId: {rid})")
    url = info.get("RecipeUrl") if isinstance(info, dict) else info["RecipeUrl"]
    if isinstance(url, float):  # NaN
        url = ""
    if url:
        print(f"URL: {url}")
    print("-"*60)
    print(f"Description: {safe(info['Description'])}")
    print(f"Category: {safe(info['RecipeCategory'])} | Cuisine: {safe(info['RecipeCuisine'])}")
    print(f"Servings: {safe(info['RecipeServings'])}")
    print(f"Total: {safe(info['TotalTime'])[2:]} | Prep: {safe(info['PrepTime'])[2:]} | Cook: {safe(info['CookTime'])[2:]}")
    print(f"Nutrition (per recipe or serving as provided): "
          f"Calories={safe(info['Calories'])}, Protein={safe(info['ProteinContent'])}, "
          f"Fat={safe(info['FatContent'])}, Carbs={safe(info['CarbohydrateContent'])}")
    kw = safe(info['Keywords'])
    if kw:
        print(f"Keywords: {kw}")
    print("-"*60)
    instr = safe(info['Instructions'])
    print("Instructions:")
    print(instr if instr else "(No instructions provided)")
    print("="*60 + "\n")

# ---------- Example ----------
if __name__ == "__main__":
    user_ingredients = ["beef", "chicken", "onion", "broccoli"]
    recs = get_recommendations(user_ingredients, top_n=4)
    choices = present_choices(recs)

    # Example: pretend the user typed 'B'
    user_choice = "A"
    print(f"\nYou selected: {user_choice}\n")
    show_recipe_for_choice(user_choice, choices)
