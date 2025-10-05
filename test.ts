import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChefHat,
  Plus,
  X,
  RefreshCw,
  Save,
  Share2,
  Download,
  Trash2,
  Sparkles,
  ClipboardCopy,
  Upload,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// --------------------------------------------
// Types & Constants (trimmed to what's needed)
// --------------------------------------------

type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "dairy-free"
  | "keto"
  | "paleo"
  | "halal"
  | "kosher";

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

// --------------------------------------------
// Utilities
// --------------------------------------------

const minutesToPretty = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} hr ${mm} min` : `${h} hr`;
};

// Simple sample data for demo purposes
const demoRecipes: Recipe[] = [
  {
    id: "r1",
    title: "Cozy Italian Tomato Basil Pasta",
    description: "A comforting weeknight pasta with garlic, basil, and a touch of cream.",
    cuisine: "Italian",
    servings: 4,
    timeMinutes: 35,
    dietary: ["vegetarian"],
    ingredients: [
      "12 oz spaghetti",
      "2 tbsp olive oil",
      "3 cloves garlic, minced",
      "1 can (28 oz) crushed tomatoes",
      "1/4 cup heavy cream (optional)",
      "1/2 cup fresh basil, torn",
      "Salt & pepper to taste",
      "Parmesan to serve",
    ],
    steps: [
      "Bring a large pot of salted water to a boil and cook spaghetti al dente.",
      "Meanwhile, warm olive oil in a skillet; sauté garlic 30–60 seconds until fragrant.",
      "Add crushed tomatoes; simmer 10–12 minutes. Stir in cream if using.",
      "Toss pasta with sauce and basil. Season and serve with Parmesan.",
    ],
    tips: ["Reserve some pasta water to loosen the sauce if needed."],
    caloriesPerServing: 520,
  },
  {
    id: "r2",
    title: "Sweet-Spicy Thai Coconut Tofu",
    description: "Tofu in a creamy coconut-lime sauce with chilies and herbs.",
    cuisine: "Thai",
    servings: 3,
    timeMinutes: 25,
    dietary: ["vegan", "gluten-free"],
    ingredients: [
      "14 oz extra-firm tofu, cubed",
      "1 tbsp neutral oil",
      "1 can (14 oz) coconut milk",
      "1 tbsp red curry paste",
      "1 tbsp soy or tamari",
      "1 lime (zest & juice)",
      "Handful of cilantro & basil",
      "Steamed rice to serve",
    ],
    steps: [
      "Sear tofu in oil until golden on all sides.",
      "Add curry paste and bloom briefly, then stir in coconut milk and soy/tamari.",
      "Simmer 5–7 minutes; finish with lime zest/juice and herbs. Serve over rice.",
    ],
    tips: ["Add veggies like peppers or snap peas for extra crunch."],
    caloriesPerServing: 430,
  },
];

// --------------------------------------------
// Recipe Modal
// --------------------------------------------

type RecipeModalProps = {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function RecipeModal({ recipe, open, onOpenChange }: RecipeModalProps) {
  const printRef = useRef<HTMLDivElement | null>(null);

  const handleCopy = useCallback(() => {
    if (!recipe) return;
    const text = `"${recipe.title}"
${recipe.description}
\nCuisine: ${recipe.cuisine}
Servings: ${recipe.servings}\nTime: ${minutesToPretty(
      recipe.timeMinutes
    )}\nDietary: ${recipe.dietary.join(", ")}\nCalories/serv: ${
      recipe.caloriesPerServing ?? "–"
    }\n\nINGREDIENTS\n- ${recipe.ingredients.join("\n- ")}\n\nINSTRUCTIONS\n${recipe.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n")}\n\nTIPS\n- ${(recipe.tips || []).join("\n- ")}`;
    navigator.clipboard.writeText(text).catch(() => {});
  }, [recipe]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.open();
    w.document.write(`<!doctype html><html><head><title>${recipe?.title ?? "Recipe"}</title></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }, [printRef, recipe]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {recipe && (
          <div ref={printRef} className="bg-white">
            <div className="px-6 pt-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-semibold">
                  {recipe.title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {recipe.description}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{recipe.cuisine}</Badge>
                {recipe.dietary.map((d) => (
                  <Badge key={d} className="capitalize">
                    {d}
                  </Badge>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Servings:</span> {recipe.servings}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {minutesToPretty(
                    recipe.timeMinutes
                  )}
                </div>
                <div>
                  <span className="font-medium">Calories/serv:</span>{" "}
                  {recipe.caloriesPerServing ?? "–"}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <ScrollArea className="max-h-[60vh] px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section>
                  <h3 className="text-base font-semibold mb-2">Ingredients</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-semibold mb-2">Instructions</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    {recipe.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </section>
              </div>

              {!!recipe.tips?.length && (
                <section className="mt-6">
                  <h3 className="text-base font-semibold mb-2">Tips</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {recipe.tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </section>
              )}
            </ScrollArea>

            <DialogFooter className="px-6 py-4">
              <div className="flex w-full items-center justify-between">
                <div className="text-xs text-muted-foreground">Press <kbd>Esc</kbd> to close</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy}>
                    <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                    <X className="mr-2 h-4 w-4" /> Close
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------
// Main Component — shows cards; click opens modal
// --------------------------------------------

export default function RecipeAppWithModal() {
  const [recipes] = useState<Recipe[]>(demoRecipes);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [open, setOpen] = useState(false);

  const onCardClick = useCallback((r: Recipe) => {
    setSelected(r);
    setOpen(true);
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ChefHat className="h-6 w-6" /> Recipes
        </h1>
        <div className="text-sm text-muted-foreground">Click a card to view the full recipe</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {recipes.map((r) => (
          <motion.div
            key={r.id}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="cursor-pointer"
            onClick={() => onCardClick(r)}
            aria-label={`Open ${r.title}`}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="line-clamp-1">{r.title}</CardTitle>
                <CardDescription className="line-clamp-2">{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{r.cuisine}</Badge>
                  <Badge variant="outline">{minutesToPretty(r.timeMinutes)}</Badge>
                  {r.dietary.slice(0, 2).map((d) => (
                    <Badge key={d} className="capitalize">
                      {d}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground justify-between">
                <span>Serves {r.servings}</span>
                <span>{r.caloriesPerServing ? `${r.caloriesPerServing} cal/serv` : ""}</span>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <RecipeModal recipe={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
