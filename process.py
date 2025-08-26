import pandas as pd
import re
import ast

df = pd.read_csv('recipes.csv')

# Function to parse the R-like c() string into a Python list of strings
def parse_r_list_string(s):
    if pd.isna(s):
        return []
    # Extract content within c() and then find all quoted strings
    match = re.match(r'c\((.*)\)', s)
    if match:
        content = match.group(1)
        # Find all strings enclosed in single or double quotes
        items = re.findall(r'"([^"]*)"|\'([^\']*)\'', content)
        # Flatten the list of tuples and remove empty strings
        parsed_items = [item for sublist in items for item in sublist if item]
        return parsed_items
    return []

# Apply the parsing function
df['RecipeIngredientParts'] = df['RecipeIngredientParts'].apply(parse_r_list_string)

# Function to clean ingredient names (e.g., remove extra spaces, convert to lowercase)
def clean_ingredient(ingredient):
    return ingredient.strip().lower()

df['CleanedIngredients'] = df['RecipeIngredientParts'].apply(lambda x: [clean_ingredient(i) for i in x])

# Save cleaned data for later use
df[['RecipeId', 'Name', 'CleanedIngredients', 'Calories', 'ProteinContent', 'FatContent', 'CarbohydrateContent']].to_csv('processed_recipes.csv', index=False)

print('Ingredient preprocessing complete. Saved to processed_recipes.csv')
print(df[['RecipeId', 'Name', 'CleanedIngredients']].head())
