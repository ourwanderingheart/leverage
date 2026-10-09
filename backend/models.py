from typing import List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

Section = Literal[
    "in_scope", "out_of_scope",
    "patterns", "relationships", "assumptions", "stakeholders", "loops", "boundaries",
    "leverage",
]
SECTIONS = set(Section.__args__)
SECTION_LABELS = {
    "in_scope": "Inside scope", "out_of_scope": "Outside scope but influencing", "patterns": "Patterns over time",
    "relationships": "Relationships", "assumptions": "Assumptions", "stakeholders": "Stakeholders",
    "loops": "Possible feedback loops", "boundaries": "System boundaries", "leverage": "Possible leverage",
}
EPISTEMIC_LABELS = {"known": "Known", "inferred": "Inferred", "unknown": "Unknown"}
Epistemic = Literal["known", "inferred", "unknown"]
UserEpistemic = Literal["known", "unknown"]
Stage = Literal["focus", "see", "decide", "learn"]


class Doc(BaseModel):
    model_config = ConfigDict(extra="ignore")


class User(Doc):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "password"
    created_at: str


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


class Item(Doc):
    id: str
    section: Section
    text: str
    note: str = ""
    epistemic: Epistemic
    source: Literal["user", "guide"] = "user"
    created_at: str
    updated_at: str


class ItemIn(BaseModel):
    section: Section
    text: str = Field(min_length=1, max_length=600)
    note: str = Field(default="", max_length=1000)
    epistemic: UserEpistemic = "known"


class ItemUpdate(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1, max_length=600)
    note: Optional[str] = Field(default=None, max_length=1000)
    epistemic: Optional[UserEpistemic] = None


class Experiment(Doc):
    id: str
    title: str
    action: str = ""
    hypothesis: str = ""
    signal: str = ""
    timeframe: str = ""
    leverage_item_id: Optional[str] = None
    status: Literal["planned", "running", "done"] = "planned"
    created_at: str
    updated_at: str


class ExperimentIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    action: str = Field(default="", max_length=1500)
    hypothesis: str = Field(default="", max_length=1500)
    signal: str = Field(default="", max_length=1500)
    timeframe: str = Field(default="", max_length=120)
    leverage_item_id: Optional[str] = None
    status: Literal["planned", "running", "done"] = "planned"


class ExperimentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    action: Optional[str] = None
    hypothesis: Optional[str] = None
    signal: Optional[str] = None
    timeframe: Optional[str] = None
    leverage_item_id: Optional[str] = None
    status: Optional[Literal["planned", "running", "done"]] = None


class Learning(Doc):
    id: str
    experiment_id: Optional[str] = None
    tried: str = ""
    happened: str = ""
    surprised: str = ""
    changed: str = ""
    revise: str = ""
    created_at: str


class LearningIn(BaseModel):
    experiment_id: Optional[str] = None
    tried: str = Field(min_length=1, max_length=2000)
    happened: str = Field(default="", max_length=2000)
    surprised: str = Field(default="", max_length=2000)
    changed: str = Field(default="", max_length=2000)
    revise: str = Field(default="", max_length=2000)


class Link(Doc):
    id: str
    from_id: str
    to_id: str
    note: str = ""
    epistemic: Epistemic = "unknown"
    source: Literal["user", "guide"] = "user"
    created_at: str


class MapSnapshot(Doc):
    learning_id: str
    created_at: str
    items: List[Item] = []
    links: List[Link] = []


class LinkIn(BaseModel):
    from_id: str
    to_id: str
    note: str = Field(default="", max_length=300)
    epistemic: UserEpistemic = "unknown"


class TimelineEvent(Doc):
    id: str
    kind: str
    summary: str
    detail: dict = {}
    created_at: str


class Analysis(Doc):
    id: str
    user_id: str
    title: str
    challenge: str
    current_situation: str = ""
    desired_situation: str = ""
    focus_question: str = ""
    stage: Stage = "focus"
    items: List[Item] = []
    links: List[Link] = []
    experiments: List[Experiment] = []
    learnings: List[Learning] = []
    created_at: str
    updated_at: str


class AnalysisSummary(Doc):
    id: str
    title: str
    challenge: str
    stage: Stage
    counts: dict
    experiment_count: int
    learning_count: int
    created_at: str
    updated_at: str


class AnalysisCreate(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    challenge: str = Field(min_length=1, max_length=3000)
    current_situation: str = Field(default="", max_length=3000)
    desired_situation: str = Field(default="", max_length=3000)


class AnalysisUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=140)
    challenge: Optional[str] = Field(default=None, min_length=1, max_length=3000)
    current_situation: Optional[str] = Field(default=None, max_length=3000)
    desired_situation: Optional[str] = Field(default=None, max_length=3000)
    focus_question: Optional[str] = Field(default=None, max_length=1500)
    stage: Optional[Stage] = None


class Proposal(Doc):
    id: str
    type: Literal["item", "link", "experiment"] = "item"
    section: Optional[Section] = None
    text: str
    epistemic: Epistemic = "inferred"
    rationale: str = ""
    from_id: Optional[str] = None
    to_id: Optional[str] = None
    from_text: str = ""
    to_text: str = ""
    experiment: Optional[dict] = None
    status: Literal["pending", "accepted", "dismissed"] = "pending"
    item_id: Optional[str] = None


class GuideMessage(Doc):
    id: str
    analysis_id: str
    role: Literal["user", "assistant"]
    content: str
    stage: Stage = "focus"
    proposals: List[Proposal] = []
    created_at: str


class GuideMessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    stage: Stage = "focus"


class ProposalAccept(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1, max_length=600)
    epistemic: Optional[Epistemic] = None
