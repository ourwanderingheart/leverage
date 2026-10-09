import { ItemList } from "@/components/workspace/ItemList";
import { SystemMap } from "@/components/workspace/SystemMap";

const SEE_SECTIONS = ["patterns", "stakeholders", "relationships", "loops", "assumptions", "boundaries"];

export const SeeStage = ({ analysis, actions }) => (
  <div className="space-y-6" data-testid="stage-see">
    <SystemMap analysis={analysis} />
    <div className="grid gap-6 xl:grid-cols-2">
      {SEE_SECTIONS.map((s) => <ItemList key={s} section={s} items={analysis.items} actions={actions} />)}
    </div>
  </div>
);
