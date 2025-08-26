
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import ast

# --- Google Colab Setup (Instructions for User) ---
# 1. Upload 'processed_recipes.csv' to your Colab environment.
#    You can do this by clicking the folder icon on the left sidebar -> 'Files' -> 'Upload to session storage'.
#    Make sure the file is in the root directory or adjust the path below.

# Load processed data (using a subset for faster execution in Colab)
# For full dataset, remove .head(50000)
df = pd.read_csv('processed_recipes.csv').head(50000) # Using a subset


# Convert string representation of list to actual list
df['CleanedIngredients'] = df['CleanedIngredients'].apply(ast.literal_eval)

# Combine cleaned ingredients into a single string for TF-IDF
df['IngredientsString'] = df['CleanedIngredients'].apply(lambda x: ' '.join(x))

# Initialize TF-IDF Vectorizer
tfidf_vectorizer = TfidfVectorizer()

# Fit and transform the ingredient strings
tfidf_matrix = tfidf_vectorizer.fit_transform(df['IngredientsString'])

# Calculate cosine similarity matrix
# Note: For a larger dataset, this matrix can be very large and consume a lot of memory.
# For production, consider on-the-fly similarity calculation or approximate nearest neighbors.
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

print("TF-IDF Vectorization and Cosine Similarity calculation complete.")

# --- Recommendation Function ---
def get_recommendations(ingredients_list, df_recipes, tfidf_vec, cosine_sim_matrix, top_n=5):
    # Clean and combine input ingredients
    cleaned_input_ingredients = [ing.strip().lower() for ing in ingredients_list]
    input_string = ' '.join(cleaned_input_ingredients)

    # Transform input ingredients using the trained TF-IDF vectorizer
    input_tfidf = tfidf_vec.transform([input_string])

    # Calculate similarity between input and all recipes
    input_sim_scores = cosine_similarity(input_tfidf, tfidf_vec.transform(df_recipes['IngredientsString']))[0]

    # Get top N similar recipes
    # Sort by similarity score in descending order
    # Get the indices of the top N recipes
    top_recipe_indices = input_sim_scores.argsort()[-top_n:][::-1]

    # Get the actual recipe names and their similarity scores
    recommendations = []
    for idx in top_recipe_indices:
        recommendations.append({
            'RecipeId': df_recipes.iloc[idx]['RecipeId'],
            'Name': df_recipes.iloc[idx]['Name'],
            'SimilarityScore': input_sim_scores[idx]
        })
    return recommendations

# --- Example Usage (for Colab) ---
if __name__ == '__main__':
    print("\n--- Example Usage ---")
    user_ingredients = ['chicken', 'broccoli', 'garlic', 'soy sauce']
    print(f"User Ingredients: {user_ingredients}")

    recommended_recipes = get_recommendations(
        user_ingredients,
        df,
        tfidf_vectorizer,
        cosine_sim,
        top_n=5
    )

    print("\nRecommended Recipes:")
    for recipe in recommended_recipes:
        print(f"- {recipe['Name']} (Score: {recipe['SimilarityScore']:.2f})")

    print("\n--- End of Example ---")



