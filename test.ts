import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChefHat, Plus, X, RefreshCw, Save, Share2, Download, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --------------------------------------------
// Utility Types & Constants
// --------------------------------------------

type DietaryTag = "vegan" | "vegetarian" | "gluten-free" | "dairy-free" | "keto" | "paleo" | "halal" | "kosher";

type Cuisine =
  | "American"
  | "Italian"
  | "Mexican"
  | "Indian"
  | "Chinese"
  | "Japanese"
  | "Thai"
  | "Mediterranean"
  | "French"
  | "Middle Eastern"
  | "Other";

type Recipe = {
  id: string;
  title: string;
  description: string;
  cuisine: Cuisine | "Fusion";
  servings: number;
  timeMinutes: number;
  dietary: DietaryTag[];
  ingredients: string[];
  steps: string[];
  tips?: string[];
  caloriesPerServing?: number;
};

const DEFAULT_TAGS: DietaryTag[] = ["vegetarian", "gluten-free", "dairy-free", "vegan", "keto", "paleo", "halal", "kosher"];

const FLAVOR_MAP: Record<Cuisine, string[]> = {
  American: ["smoky", "buttery", "peppery", "herbaceous"],
  Italian: ["garlicky", "herby", "umami", "tomato-forward"],
  Mexican: ["spicy", "citrusy", "smoky", "fresh"],
  Indian: ["aromatic", "spiced", "creamy", "tangy"],
  Chinese: ["savory", "gingery", "garlicky", "umami"],
  Japanese: ["umami", "clean", "miso", "sesame"],
  Thai: ["sweet-spicy", "coconut", "herbal", "tangy"],
  Mediterranean: ["lemony", "herby", "olive-forward", "bright"],
  French: ["buttery", "winey", "herbaceous", "delicate"],
  "Middle Eastern": ["warm-spiced", "tahini", "sumac", "herbal"],
  Other: ["balanced", "homey", "comforting", "fresh"],
};

const COOK_TECHNIQUES = [
  "sauté until fragrant",
  "roast until caramelized",
  "simmer gently",
  "sear on high heat",
  "braise until tender",
  "steam lightly",
  "grill for char",
  "stir-fry briskly",
];

const TITLE_TEMPLATES = [
  "${cuisine} ${main} with ${accent}",
  "Weeknight ${main} ${style}",
  "One-Pan ${main} (${accent})",
  "Cozy ${cuisine} ${main}",
  "Bright ${accent} ${main}",
];

// --------------------------------------------
// Helpers
// --------------------------------------------

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (n-- > 0 && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function estCalories(ingredients: string[], servings: number) {
  // Extremely rough heuristic: count calorie hints
  const dense = ["cream", "cheese", "butter", "oil", "bacon", "nut", "peanut", "almond", "avocado", "coconut"];
  const lean = ["tomato", "spinach", "kale", "broccoli", "cabbage", "zucchini", "mushroom", "onion", "pepper", "herb", "lettuce"];
  let score = 250; // base dish calories per serving
  for (const ing of ingredients) {
    const i = ing.toLowerCase();
    if (dense.some((k) => i.includes(k))) score += 40;
    if (lean.some((k) => i.includes(k))) score -= 10;
  }
  return Math.max(120, Math.round(score / Math.max(1, servings)) * 1);
}

function constrainByDiet(ings: string[], dietary: DietaryTag[]): string[] {
  let out = ings.filter(Boolean);
  const removeIf = (substrs: string[]) => (out = out.filter((x) => !substrs.some((s) => x.toLowerCase().includes(s))));
  if (dietary.includes("vegetarian") || dietary.includes("vegan")) removeIf(["chicken", "beef", "pork", "fish", "shrimp", "anchovy", "bacon"]);
  if (dietary.includes("vegan")) removeIf(["cheese", "butter", "milk", "egg", "yogurt", "honey"]);
  if (dietary.includes("gluten-free")) removeIf(["wheat", "pasta", "breadcrumbs", "soy sauce (not gf)"]);
  if (dietary.includes("dairy-free")) removeIf(["cheese", "butter", "milk", "yogurt", "cream"]);
  if (dietary.includes("keto")) removeIf(["rice", "potato", "bread", "pasta", "sugar", "honey"]);
  // halal/kosher are contextual; basic exclusions
  if (dietary.includes("halal")) removeIf(["pork", "bacon"]);
  if (dietary.includes("kosher")) removeIf(["pork", "shellfish", "bacon"]);
  return out;
}

function generateRecipe(params: {
  pantry: string[];
  cuisine: Cuisine;
  servings: number;
  dietary: DietaryTag[];
  notes?: string;
}): Recipe {
  const { pantry, cuisine, servings, dietary, notes } = params;
  const cleanedPantry = constrainByDiet(
    pantry.map((s) => s.trim()).filter(Boolean),
    dietary
  );

  const main = cleanedPantry.find((x) => /chicken|beef|tofu|paneer|egg|lentil|mushroom|bean|shrimp|salmon|tempeh/i.test(x)) ||
    cleanedPantry[0] || "market veggies";

  const accent = rand(FLAVOR_MAP[cuisine]);
  const style = rand(["bowls", "skillet", "salad", "pasta", "stir-fry", "tacos", "wraps", "curry", "stew"]);
  const title = rand(TITLE_TEMPLATES)
    .replace("${cuisine}", cuisine)
    .replace("${main}", main.replace(/(^.|\s+.)/g, (m) => m.toUpperCase()))
    .replace("${accent}", accent)
    .replace("${style}", style);

  // Ingredient synthesis
  const basePantry = [
    "olive oil",
    "salt",
    "black pepper",
    "garlic",
    "onion",
    "chili flakes",
    "lemon",
  ];
  const chosen = Array.from(new Set([...(cleanedPantry.length ? sample(cleanedPantry, Math.min(6, cleanedPantry.length)) : []), ...sample(basePantry, 4)]));

  const steps: string[] = [];
  const technique = rand(COOK_TECHNIQUES);
  steps.push(`Prep: Dice aromatics, cut ${main} into bite-size pieces. Preheat pan and bring a pot of water/stock if needed.`);
  steps.push(`Flavor base: Add oil, then aromatics (garlic/onion). ${technique} (2–3 min). Season with salt & pepper.`);
  steps.push(`Add mains: Add ${main} and remaining ingredients. Toss to coat with aromatics and spices.`);
  steps.push(`Build sauce/body: Add splashes of water/stock/coconut milk/tomato as desired. Simmer until flavors meld (6–10 min).`);
  steps.push(`Finish: Adjust acid (lemon), fat (butter/olive oil), and heat (chili). Taste and balance.`);
  steps.push(`Serve: Plate as ${style}; garnish with herbs, citrus zest, or toasted nuts/seeds.`);

  const tips = [
    "Reserve a little starchy pasta water to emulsify sauce.",
    "Toast dry spices in oil to bloom their flavors.",
    "Balance = Acid + Fat + Heat + Salt. Taste and tweak.",
    "Undercook veg slightly; carryover heat finishes them.",
  ];

  const recipe: Recipe = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    description: `${cuisine}-inspired ${style} centered on ${main} with ${accent} notes${notes ? ` — ${notes}` : ""}.`,
    cuisine: Math.random() < 0.15 ? "Fusion" : cuisine,
    servings,
    timeMinutes: 20 + Math.floor(Math.random() * 20),
    dietary: [...dietary],
    ingredients: chosen,
    steps,
    tips: sample(tips, 2 + Math.floor(Math.random() * 2)),
    caloriesPerServing: estCalories(chosen, servings),
  };

  return recipe;
}

// --------------------------------------------
// Local Storage Hooks
// --------------------------------------------

const FAVORITES_KEY = "ts-recipe-gen:favorites";

function useFavorites() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);
  return {
    favorites,
    add: (r: Recipe) => setFavorites((f) => [r, ...f.filter((x) => x.id !== r.id)]),
    remove: (id: string) => setFavorites((f) => f.filter((x) => x.id !== id)),
    clear: () => setFavorites([]),
  };
}

// --------------------------------------------
// UI Pieces
// --------------------------------------------

function TagToggle({ tag, enabled, onChange }: { tag: DietaryTag; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <Badge
      onClick={() => onChange(!enabled)}
      className={`cursor-pointer select-none transition ${enabled ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
    >
      {tag}
    </Badge>
  );
}

function Chips({ items, onRemove }: { items: string[]; onRemove: (idx: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Badge key={i} variant="secondary" className="flex items-center gap-2">
          {item}
          <button onClick={() => onRemove(i)} className="hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:items-center">
      <Label className="sm:col-span-1 text-sm text-muted-foreground">{label}</Label>
      <div className="sm:col-span-4 flex flex-col gap-1">{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
    </div>
  );
}

// --------------------------------------------
// Main App
// --------------------------------------------

export default function App() {
  const [pantryInput, setPantryInput] = useState("");
  const [pantry, setPantry] = useState<string[]>(["chicken", "garlic", "lemon", "spinach", "rice"]);
  const [cuisine, setCuisine] = useState<Cuisine>("Mediterranean");
  const [servings, setServings] = useState(2);
  const [dietary, setDietary] = useState<DietaryTag[]>(["dairy-free"]);
  const [notes, setNotes] = useState("");
  const [autoRegenerate, setAutoRegenerate] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const { favorites, add, remove, clear } = useFavorites();

  const addPantry = () => {
    const parts = pantryInput
      .split(/,|\n/) // commas or newlines
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setPantry((p) => Array.from(new Set([...p, ...parts])));
    setPantryInput("");
  };

  const removePantryIndex = (idx: number) => setPantry((p) => p.filter((_, i) => i !== idx));

  const toggleDiet = (t: DietaryTag, on?: boolean) =>
    setDietary((d) => (on === undefined ? (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]) : on ? [...new Set([...d, t])] : d.filter((x) => x !== t)));

  const doGenerate = () => {
    const next = generateRecipe({ pantry, cuisine, servings, dietary, notes });
    setRecipe(next);
  };

  useEffect(() => {
    if (autoRegenerate) doGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantry.join("|"), cuisine, servings, dietary.join("|"), notes, autoRegenerate]);

  const canShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  const downloadJSON = () => {
    if (!recipe) return;
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(recipe.title)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySteps = async () => {
    if (!recipe) return;
    const text = `# ${recipe.title}\n\n${recipe.description}\n\nServings: ${recipe.servings}  •  ~${recipe.timeMinutes} min\nDietary: ${recipe.dietary.join(", ") || "—"}\n\nIngredients:\n- ${recipe.ingredients.join("\n- ")}\n\nSteps:\n${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nTips:\n- ${(recipe.tips || []).join("\n- ")}`;
    await navigator.clipboard.writeText(text);
    alert("Recipe copied to clipboard ✨");
  };

  const shareRecipe = async () => {
    if (!recipe || !canShare) return;
    try {
      await (navigator as any).share({
        title: recipe.title,
        text: recipe.description,
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">TypeScript Recipe Generator</h1>
              <p className="text-sm text-muted-foreground">Enter ingredients, set preferences, and whip up AI‑style recipes — locally, no server needed.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoRegenerate} onCheckedChange={setAutoRegenerate} />
            <span className="text-sm text-muted-foreground">Auto‑generate</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Inputs */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Pantry & Preferences</CardTitle>
              <CardDescription>Tell me what you have and how you like it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FieldRow label="Ingredients" hint="Type comma or newline separated. Examples: chicken, garlic, lemon, spinach, rice">
                <div className="flex gap-2">
                  <Textarea value={pantryInput} onChange={(e) => setPantryInput(e.target.value)} placeholder="e.g., chickpeas, tomato, cumin, onion, yogurt" />
                  <Button onClick={addPantry} className="shrink-0" aria-label="Add ingredients">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {!!pantry.length && (
                  <div className="mt-2">
                    <Chips items={pantry} onRemove={removePantryIndex} />
                  </div>
                )}
              </FieldRow>

              <FieldRow label="Cuisine">
                <Select value={cuisine} onValueChange={(v) => setCuisine(v as Cuisine)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cuisine" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {(
                      [
                        "American",
                        "Italian",
                        "Mexican",
                        "Indian",
                        "Chinese",
                        "Japanese",
                        "Thai",
                        "Mediterranean",
                        "French",
                        "Middle Eastern",
                        "Other",
                      ] as Cuisine[]
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label="Servings">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={servings}
                    onChange={(e) => setServings(Math.max(1, Math.min(12, parseInt(e.target.value || "1", 10))))}
                    className="w-28"
                  />
                  <Button variant="secondary" onClick={() => setServings((s) => Math.max(1, s - 1))}>-</Button>
                  <Button variant="secondary" onClick={() => setServings((s) => Math.min(12, s + 1))}>+</Button>
                </div>
              </FieldRow>

              <FieldRow label="Dietary">
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TAGS.map((t) => (
                    <TagToggle key={t} tag={t} enabled={dietary.includes(t)} onChange={(v) => toggleDiet(t, v)} />
                  ))}
                </div>
              </FieldRow>

              <FieldRow label="Notes" hint="Allergies, tools, vibes (""spicy"", ""one‑pot"", ""no nuts"", etc.)">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., make it spicy, one‑pan clean‑up" />
              </FieldRow>
            </CardContent>
            <CardFooter className="flex items-center gap-2">
              <Button onClick={doGenerate} className="gap-2"><Sparkles className="h-4 w-4" /> Generate</Button>
              <Button variant="outline" onClick={() => { setPantry([]); setNotes(""); }} className="gap-2"><Trash2 className="h-4 w-4" /> Clear</Button>
            </CardFooter>
          </Card>

          {/* Output */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recipe</CardTitle>
              <CardDescription>Your personalized, TS‑powered creation.</CardDescription>
            </CardHeader>
            <CardContent>
              {!recipe ? (
                <div className="text-sm text-muted-foreground">No recipe yet. Add a few ingredients and hit Generate.</div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{recipe.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{recipe.cuisine}</Badge>
                        <Badge variant="secondary">{recipe.timeMinutes} min</Badge>
                        <Badge variant="secondary">Serves {recipe.servings}</Badge>
                        {recipe.caloriesPerServing && <Badge variant="secondary">~{recipe.caloriesPerServing} kcal/serving</Badge>}
                        {recipe.dietary.map((d) => (
                          <Badge key={d}>{d}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => setRecipe((r) => (r ? { ...r, id: `${Date.now()}` } : r))} className="gap-2" title="Regenerate title/details">
                        <RefreshCw className="h-4 w-4" />
                        Re‑roll
                      </Button>
                      <Button variant="outline" onClick={copySteps} className="gap-2"><Save className="h-4 w-4" /> Copy</Button>
                      <Button variant="outline" onClick={downloadJSON} className="gap-2"><Download className="h-4 w-4" /> JSON</Button>
                      {canShare && (
                        <Button variant="outline" onClick={shareRecipe} className="gap-2"><Share2 className="h-4 w-4" /> Share</Button>
                      )}
                      <Button onClick={() => recipe && add(recipe)} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="font-medium mb-2">Ingredients</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Steps</h3>
                      <ol className="list-decimal pl-5 space-y-2 text-sm">
                        {recipe.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {recipe.tips && recipe.tips.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Pro Tips</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {recipe.tips.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Favorites */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Recipes</CardTitle>
            <CardDescription>Quick access to your favorites (stored locally).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.length === 0 && <p className="text-sm text-muted-foreground">No saved recipes yet.</p>}
            {favorites.map((r) => (
              <div key={r.id} className="rounded-2xl border p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold leading-tight line-clamp-2">{r.title}</h4>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">{r.cuisine}</Badge>
                    <Badge variant="secondary">{r.timeMinutes} min</Badge>
                    <Badge variant="secondary">Serves {r.servings}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="w-full" onClick={() => setRecipe(r)}>Open</Button>
                  <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(r.ingredients.join(", "))}>Copy ingredients</Button>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="justify-end">
            {favorites.length > 0 && (
              <Button variant="outline" onClick={clear} className="gap-2">
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-center text-xs text-muted-foreground py-6">
          Built with <span className="mx-1">TypeScript</span> · No external API · Your data stays in your browser
        </div>
      </div>
    </div>
  );
}
