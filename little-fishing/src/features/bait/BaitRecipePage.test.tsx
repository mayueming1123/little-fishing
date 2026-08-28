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

  it("can copy a saved recipe into a separate new draft", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue(editorData);
    vi.mocked(saveBaitRecipe).mockResolvedValue({} as never);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    expect((await screen.findByLabelText("配方名称") as HTMLInputElement).value).toBe("周末饵");
    expect(screen.getByRole("img", { name: "玉米粉像素图标" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "以此为模板新建" }));
    expect((screen.getByLabelText("配方名称") as HTMLInputElement).value).toBe("周末饵副本");
    fireEvent.click(screen.getByRole("button", { name: "保存并选用新配方" }));

    await waitFor(() => expect(saveBaitRecipe).toHaveBeenCalledWith(
      null,
      "周末饵副本",
      [{ ingredientId: 1, percentage: 2 }],
      true,
    ));
  });

  it("starts a genuinely blank recipe and can clear it again", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue(editorData);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    await screen.findByLabelText("配方名称");

    fireEvent.click(screen.getByRole("button", { name: /新建空白配方/ }));

    const name = screen.getByLabelText("配方名称") as HTMLInputElement;
    const amount = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(name.value).toBe("新配方");
    expect(amount.value).toBe("");
    expect((screen.getByLabelText("直接选用已保存配方") as HTMLSelectElement).value).toBe("");

    fireEvent.change(name, { target: { value: "临时空白饵" } });
    fireEvent.change(amount, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "清空全部内容" }));

    expect(name.value).toBe("新配方");
    expect(amount.value).toBe("");
    expect(screen.getByRole("status").textContent).toContain("重新清空");
  });

  it("switches among saved recipes", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue(editorData);
    vi.mocked(selectBaitRecipe).mockResolvedValue({} as never);
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);
    const select = await screen.findByLabelText("直接选用已保存配方");

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
    fireEvent.click(screen.getByRole("button", { name: "恢复已保存内容" }));

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

    fireEvent.click(screen.getByRole("button", { name: "删除当前配方" }));

    await waitFor(() => expect(deleteBaitRecipe).toHaveBeenCalledWith(2));
    await waitFor(() => expect((screen.getByLabelText("直接选用已保存配方") as HTMLSelectElement).value).toBe("1"));
    expect(screen.getByRole("status").textContent).toContain("已切回综合试钓饵");
    confirm.mockRestore();
  });

  it("protects the default recipe from deletion", async () => {
    vi.mocked(getBaitEditorData).mockResolvedValue({ ...editorData, recipeId: 1, recipeName: "综合试钓饵" });
    render(<BaitRecipePage isFishing={false} onSaved={vi.fn().mockResolvedValue(undefined)} />);

    expect((await screen.findByRole("button", { name: "删除当前配方" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
