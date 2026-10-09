import { Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemList } from "@/components/workspace/ItemList";
import { SystemMap } from "@/components/workspace/SystemMap";
import { LinksSection } from "@/components/workspace/LinksSection";

const SEE_SECTIONS = ["patterns", "stakeholders", "relationships", "loops", "assumptions", "boundaries"];

export const SeeStage = ({ analysis, actions, onCompare }) => (
  <div className="space-y-6" data-testid="stage-see">
    {analysis.learnings.length > 0 && (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => onCompare(null)} className="rounded-full border-slate-700 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white" data-testid="compare-open-btn">
          <Columns2 className="mr-1.5 h-4 w-4" />Before / after a learning loop
        </Button>
      </div>
    )}
    <SystemMap analysis={analysis} />
    <LinksSection analysis={analysis} actions={actions} />
    <div className="grid gap-6 xl:grid-cols-2">
      {SEE_SECTIONS.map((s) => <ItemList key={s} section={s} items={analysis.items} actions={actions} />)}
    </div>
  </div>
);
