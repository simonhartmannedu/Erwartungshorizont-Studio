import { Task } from "../types";
import { DuplicateIcon, PlusIcon, TrashIcon } from "./icons";
import { Field, IconButton, NumberInput, TextAreaField } from "./ui";

interface Props {
  tasks: Task[];
  onChange: (taskId: string, patch: Partial<Task>) => void;
  onAdd: () => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  onMove: (taskId: string, direction: "up" | "down") => void;
}

export const TaskTable = ({
  tasks,
  onChange,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
}: Props) => (
  <div className="space-y-4">
    <div className="space-y-3 md:hidden">
      {tasks.map((task, index) => (
        <div key={task.id} className="surface-elevated rounded-3xl border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label !mb-1">Unteraufgabe</p>
              <p className="themed-strong text-sm font-semibold">{index + 1}. Aufgabe</p>
            </div>
            <div className="control-cluster inline-flex flex-wrap items-center gap-1 rounded-full border p-1">
              <IconButton onClick={() => onMove(task.id, "up")} title="Nach oben" className="px-2.5 py-2 text-xs">
                ↑
              </IconButton>
              <IconButton onClick={() => onMove(task.id, "down")} title="Nach unten" className="px-2.5 py-2 text-xs">
                ↓
              </IconButton>
              <IconButton onClick={() => onDuplicate(task.id)} title="Duplizieren" className="px-2.5 py-2 text-xs">
                <DuplicateIcon />
              </IconButton>
              <IconButton onClick={() => onDelete(task.id)} title="Löschen" variant="soft" className="px-2.5 py-2 text-xs">
                <TrashIcon />
              </IconButton>
            </div>
          </div>
          <div className="grid gap-4">
            <Field label="Aufgabenname">
              <input
                className="field !px-3 !py-2.5 text-sm font-medium"
                value={task.title}
                onChange={(e) => onChange(task.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Mögl. Schülerantwort">
              <TextAreaField
                className="min-h-28 !px-3 !py-2.5 text-sm leading-6"
                value={task.description}
                showListTransform
                onValueChange={(value) => onChange(task.id, { description: value })}
                placeholder="Stichpunkte oder mögliche Schülerantwort"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max.">
                <NumberInput
                  className="field w-full !px-2 !py-2 text-center text-sm font-semibold"
                  min={0}
                  step={0.5}
                  value={task.maxPoints}
                  onCommit={(value) => onChange(task.id, { maxPoints: value })}
                />
              </Field>
              <Field label="Erreicht">
                <NumberInput
                  className="field w-full !px-2 !py-2 text-center text-sm font-semibold"
                  min={0}
                  step={0.5}
                  value={task.achievedPoints}
                  onCommit={(value) => onChange(task.id, { achievedPoints: value })}
                />
              </Field>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="hidden md:block">
      <div className="themed-table-shell overflow-hidden rounded-3xl border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[52%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="themed-table-head">
              <tr className="text-left text-xs uppercase tracking-[0.16em]">
                <th className="px-3 py-2.5">Aufgabe</th>
                <th className="px-3 py-2.5">Mögl. Schülerantwort</th>
                <th className="px-3 py-2.5 text-center">Max.</th>
                <th className="px-3 py-2.5 text-center">Erreicht</th>
                <th className="px-3 py-2.5 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="themed-table-body">
              {tasks.map((task) => (
                <tr key={task.id} className="themed-table-row align-top">
                  <td className="px-3 py-3">
                    <div className="space-y-2">
                      <p className="themed-muted text-[11px] font-semibold uppercase tracking-[0.16em]">
                        Aufgabenname
                      </p>
                      <input
                        className="field min-w-[9rem] !px-3 !py-2.5 text-sm font-medium"
                        value={task.title}
                        onChange={(e) => onChange(task.id, { title: e.target.value })}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-2">
                      <p className="themed-muted text-[11px] font-semibold uppercase tracking-[0.16em]">
                        Inhalt
                      </p>
                      <TextAreaField
                        className="min-h-28 min-w-[18rem] !px-3 !py-2.5 text-sm leading-6"
                        value={task.description}
                        showListTransform
                        onValueChange={(value) => onChange(task.id, { description: value })}
                        placeholder="Stichpunkte oder mögliche Schülerantwort"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <NumberInput
                      className="field mx-auto w-16 !px-2 !py-2 text-center text-sm font-semibold"
                      min={0}
                      step={0.5}
                      value={task.maxPoints}
                      onCommit={(value) => onChange(task.id, { maxPoints: value })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <NumberInput
                      className="field mx-auto w-16 !px-2 !py-2 text-center text-sm font-semibold"
                      min={0}
                      step={0.5}
                      value={task.achievedPoints}
                      onCommit={(value) => onChange(task.id, { achievedPoints: value })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <div className="control-cluster inline-flex items-center gap-1 rounded-full border p-1">
                        <IconButton onClick={() => onMove(task.id, "up")} title="Nach oben" className="px-2.5 py-2 text-xs">
                          ↑
                        </IconButton>
                        <IconButton onClick={() => onMove(task.id, "down")} title="Nach unten" className="px-2.5 py-2 text-xs">
                          ↓
                        </IconButton>
                        <IconButton onClick={() => onDuplicate(task.id)} title="Duplizieren" className="px-2.5 py-2 text-xs">
                          <DuplicateIcon />
                        </IconButton>
                        <IconButton onClick={() => onDelete(task.id)} title="Löschen" variant="soft" className="px-2.5 py-2 text-xs">
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <Field label="Neue Unteraufgabe">
      <button type="button" className="button-secondary w-full gap-2 sm:w-auto" onClick={onAdd}>
        <PlusIcon />
        Unteraufgabe ergänzen
      </button>
    </Field>
  </div>
);
