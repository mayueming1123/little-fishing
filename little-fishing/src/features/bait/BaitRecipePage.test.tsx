import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BaitEditorData } from "../../domain/prototype";
import { deleteBaitRecipe, getBaitEditorData, saveBaitRecipe, selectBaitRecipe } from "../../ipc/client";
import { BaitRecipePage } from "./BaitRecipePage";

vi.mock("../../ipc/client", () => ({
  getBaitEditorData: vi.fn(),
  saveBaitRecipe: vi.fn(),
  selectBaitRecipe: vi.fn(),
  deleteBaitRecipe: vi.fn(),
}));

const editorData: BaitEditorData = {
  ingredients: [{ id: 1, name: "玉米粉", flavor: { intensity: 0.4, color: 0.3, sweet: 0.6, sour: 0, salty: 0.1 } }],
  recipeId: 2,
  recipeName: "周末饵",
  recipes: [{ id: 1, name: "综合试钓饵" }, { id: 2, name: "周末饵" }],
  components: [{ ingredientId: 1, percentage: 2 }],
  canEdit: true,
};

describe("BaitRecipePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("can save a copy without replacing the selected recipe", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue(editorData);
    vi.mocked(saveBaitRecipe).mockResolvedValue({} as never);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    expect((await screen.findByLabelText("配方名称") as HTMLInputElement).value).toBe("周末饵");
    expect(screen.getByRole("img", { name: "玉米粉像素图标" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "另存为新方案" }));

    await waitFor(() => expect(saveBaitRecipe).toHaveBeenCalledWith(
      2,
      "周末饵",
      [{ ingredientId: 1, percentage: 2 }],
      true,
    ));
  });

  it("switches among saved recipes", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue(editorData);
    vi.mocked(selectBaitRecipe).mockResolvedValue({} as never);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    const select = await screen.findByLabelText("已保存方案");

    fireEvent.change(select, { target: { value: "1" } });

    await waitFor(() => expect(selectBaitRecipe).toHaveBeenCalledWith(1));
  });

  it("resets unsaved name and component changes", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue(editorData);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    const name = await screen.findByLabelText("配方名称") as HTMLInputElement;
    const amount = screen.getByRole("spinbutton") as HTMLInputElement;

    fireEvent.change(name, { target: { value: "临时名字" } });
    fireEvent.change(amount, { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "重置未保存修改" }));

    expect(name.value).toBe("周末饵");
    expect(amount.value).toBe("2");
    expect(screen.getByRole("status").textContent).toContain("上一次保存");
  });

  it("deletes the selected custom recipe and returns to the default", async () => {
    const defaultData: BaitEditorData = {
      ...editorData,
      recipeId: 1,
      recipeName: "综合试钓饵",
      recipes: [{ id: 1, name: "综合试钓饵" }],
      components: [{ ingredientId: 1, percentage: 1 }],
    };
    vi.mocked(getBaitEditorData)
      .mockResolvedValueOnce(editorData)
      .mockResolvedValueOnce(defaultData);
    vi.mocked(deleteBaitRecipe).mockResolvedValue({} as never);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    await screen.findByLabelText("配方名称");

    fireEvent.click(screen.getByRole("button", { name: "删除当前方案" }));

    await waitFor(() => expect(deleteBaitRecipe).toHaveBeenCalledWith(2));
    await waitFor(() => expect((screen.getByLabelText("已保存方案") as HTMLSelectElement).value).toBe("1"));
    expect(screen.getByRole("status").textContent).toContain("已切回综合试钓饵");
    confirm.mockRestore();
  });

  it("protects the default recipe from deletion", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue({ ...editorData, recipeId: 1, recipeName: "综合试钓饵" });
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);

    expect((await screen.findByRole("button", { name: "删除当前方案" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
