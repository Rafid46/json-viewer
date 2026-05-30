/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CSSProperties, memo, useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileJson,
  Minus,
  Plus,
  Palette,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

/* ---------------- TYPES ---------------- */

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue;
}

interface SearchResult {
  path: string;
  value: any;
}

interface ResponseSlot {
  id: number;
  name: string;
  jsonInput: string;
  jsonData: JsonValue | null;
  jsonError: string;
}

/* ---------------- PAGE ---------------- */

export default function JsonViewerPage() {
  /* ---------------- SLOTS ---------------- */

  const [slots, setSlots] = useState<ResponseSlot[]>([
    {
      id: 1,
      name: "Response 1",
      jsonInput: "",
      jsonData: null,
      jsonError: "",
    },
  ]);

  const [activeSlotId, setActiveSlotId] = useState(1);

  const activeSlot = slots.find((slot) => slot.id === activeSlotId);

  /* ---------------- SEARCH ---------------- */

  const [search, setSearch] = useState("");

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [highlightedPath, setHighlightedPath] = useState("");

  /* ---------------- COLORS ---------------- */

  const [mainColor, setMainColor] = useState("#f97316");

  const [objectColor, setObjectColor] = useState("#7dd3fc");

  const [fontSize, setFontSize] = useState(14);

  /* THEME */
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return (localStorage.getItem("theme") as "dark" | "light") || "dark";
    } catch {
      return "dark";
    }
  });

  const controlBg =
    theme === "light" ? "var(--panel-border)" : "var(--panel-bg)";
  const controlButtonBg =
    theme === "light" ? "var(--selected-bg)" : "rgba(255,255,255,0.08)";
  const controlButtonText = theme === "light" ? "#1e293b" : "#d1d5db";

  useEffect(() => {
    try {
      const root = document.documentElement;

      if (theme === "dark") root.classList.add("dark");
      else root.classList.remove("dark");

      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const decreaseFontSize = () => {
    setFontSize((size) => Math.max(12, size - 1));
  };

  const increaseFontSize = () => {
    setFontSize((size) => Math.min(28, size + 1));
  };

  /* ---------------- COPY ---------------- */

  const [copied, setCopied] = useState("");

  const handleCopy = useCallback(async (text: string, key: string) => {
    // Strip quotes from string values
    let textToCopy = text;
    if (
      typeof text === "string" &&
      text.startsWith('"') &&
      text.endsWith('"')
    ) {
      textToCopy = text.slice(1, -1);
    }

    await navigator.clipboard.writeText(textToCopy);

    setCopied(key);

    setTimeout(() => {
      setCopied("");
    }, 1500);
  }, []);

  /* ---------------- FILE UPLOAD ---------------- */
  const updateSlotInput = (value: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== activeSlotId) return slot;

        try {
          const parsed = value.trim() === "" ? null : JSON.parse(value);

          return {
            ...slot,
            jsonInput: value,
            jsonData: parsed,
            jsonError: "",
          };
        } catch {
          return {
            ...slot,
            jsonInput: value,
            jsonData: null,
            jsonError: "Invalid JSON",
          };
        }
      }),
    );
  };
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          // Validate JSON
          JSON.parse(content);
          updateSlotInput(content);
        } catch (error) {
          // Error is handled by updateSlotInput
          updateSlotInput(content);
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be uploaded again
      event.target.value = "";
    },
    [],
  );

  /* ---------------- SLOT JSON UPDATE ---------------- */

  /* ---------------- ADD SLOT ---------------- */

  const addSlot = () => {
    const newId = slots.length + 1;

    const newSlot = {
      id: newId,
      name: `Response ${newId}`,
      jsonInput: "",
      jsonData: null,
      jsonError: "",
    };

    setSlots((prev) => [...prev, newSlot]);

    setActiveSlotId(newId);
  };

  /* ---------------- DELETE SLOT ---------------- */

  const deleteSlot = (id: number) => {
    if (slots.length === 1) return;

    const updated = slots.filter((slot) => slot.id !== id);

    setSlots(updated);

    if (activeSlotId === id) {
      setActiveSlotId(updated[0].id);
    }
  };

  /* ---------------- SEARCH JSON ---------------- */

  const searchJson = (
    obj: JsonValue,
    keyword: string,
    currentPath = "data",
  ): SearchResult[] => {
    const results: SearchResult[] = [];

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        results.push(...searchJson(item, keyword, `${currentPath}[${index}]`));
      });

      return results;
    }

    if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const path = `${currentPath}.${key}`;

        if (key.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({
            path,
            value,
          });
        }

        results.push(...searchJson(value, keyword, path));
      });
    }

    return results;
  };

  /* ---------------- HANDLE SEARCH ---------------- */

  const handleSearch = () => {
    if (!search.trim()) return;

    if (!activeSlot?.jsonData) return;

    const results = searchJson(activeSlot.jsonData, search);

    setSearchResults(results);

    setSelectedResultIndex(0);

    if (results.length > 0) {
      setHighlightedPath(results[0].path);

      setTimeout(() => {
        const el = document.querySelector(`[data-path="${results[0].path}"]`);

        el?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  };
  const goToSearchResult = (direction: "next" | "prev") => {
    if (searchResults.length === 0) return;

    let nextIndex = selectedResultIndex;

    if (direction === "next") {
      nextIndex = (selectedResultIndex + 1) % searchResults.length;
    } else {
      nextIndex =
        selectedResultIndex === 0
          ? searchResults.length - 1
          : selectedResultIndex - 1;
    }

    setSelectedResultIndex(nextIndex);

    const nextResult = searchResults[nextIndex];

    setHighlightedPath(nextResult.path);

    setTimeout(() => {
      const el = document.querySelector(`[data-path="${nextResult.path}"]`);

      el?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  /* ---------------- MAPPING ---------------- */

  const generateMappings = (path: string) => {
    return {
      next: `{${path}}`,
      vue: `{{ ${path} }}`,
    };
  };

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={
        {
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          "--main-color": mainColor,
          "--main-color-20": `${mainColor}20`,
          "--main-color-30": `${mainColor}30`,
          "--main-color-08": `${mainColor}08`,
          "--object-color": objectColor,
          "--object-color-20": `${objectColor}20`,
        } as CSSProperties
      }
    >
      {/* ========================================= */}
      {/* LEFT SIDEBAR */}
      {/* ========================================= */}

      <div
        className="border-r flex flex-col mt-4 w-[200px]"
        style={{
          backgroundColor: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
        }}
      >
        {/* HEADER */}

        <button
          onClick={addSlot}
          className="px-6 py-2 rounded-xl mx-3 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
          }}
        >
          <Plus className="w-4 h-4 shrink-0 text-white" />
          <p className="text-sm whitespace-nowrap text-white"> Add Json Slot</p>
        </button>

        {/* SLOT LIST */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1E293B] hover:scrollbar-thumb-[#334155] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1E293B] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-corner]:bg-transparent">
          {slots.map((slot) => {
            const active = activeSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`relative group rounded-xl border cursor-pointer transition-all slot-item ${
                  active ? "active" : ""
                }`}
                style={{ borderColor: "var(--panel-border)" }}
                onClick={() => setActiveSlotId(slot.id)}
              >
                <div className="p-3 flex justify-between items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center px-2 py-4"
                    style={{
                      backgroundColor: "var(--main-color-20)",
                    }}
                  >
                    <FileJson
                      className="w-5 h-5"
                      style={{
                        color: "var(--main-color)",
                      }}
                    />
                  </div>

                  <span
                    className={`text-sm text-center whitespace-nowrap ${
                      theme === "light" ? "text-zinc-800" : "text-zinc-300"
                    }`}
                  >
                    {slot.name}
                  </span>
                </div>

                {/* DELETE */}

                {slots.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      deleteSlot(slot.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}

        <div
          className="h-auto min-h-[80px] px-6 py-4 md:py-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b"
          style={{ borderColor: "var(--panel-border)" }}
        >
          {/* <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold whitespace-nowrap">
                JSON Inspector
              </h1>

              <p
                className={`text-xs mt-1 rounded-full px-4 py-1 w-fit whitespace-nowrap ${
                  theme === "light"
                    ? "text-zinc-600 bg-black/10"
                    : "text-zinc-100 bg-white/20"
                }`}
              >
                Active: {activeSlot?.name}
              </p>
            </div>
          </div> */}

          {/* COLORS & CONTROLS */}

          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-3 w-full">
            {/* THEME SWITCH */}
            <div>
              <button
                onClick={() =>
                  setTheme((t) => (t === "dark" ? "light" : "dark"))
                }
                className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: controlBg,
                  border: "1px solid var(--panel-border)",
                }}
              >
                <Palette className="w-5 h-5 text-zinc-300" />
              </button>
            </div>
            {/* MAIN */}

            <div
              className="border border-white/10 rounded-xl px-3 py-2 flex items-center gap-3"
              style={{ backgroundColor: controlBg }}
            >
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-zinc-500">Main</div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={mainColor}
                    onChange={(e) => setMainColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* OBJECT */}

            <div
              className="border border-white/10 rounded-xl px-3 py-2 flex items-center gap-3"
              style={{ backgroundColor: controlBg }}
            >
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-zinc-500">Object/Arrays</div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={objectColor}
                    onChange={(e) => setObjectColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* SEARCH BAR */}

            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Search..."
                  spellCheck={false}
                  className="w-full h-10 rounded-xl pl-12 pr-12 outline-none search-input"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearchResults([]);
                      setSelectedResultIndex(0);
                      setHighlightedPath("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                {/* PREV */}

                <button
                  onClick={() => goToSearchResult("prev")}
                  className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4 text-zinc-800" />
                </button>

                {/* NEXT */}

                <button
                  onClick={() => goToSearchResult("next")}
                  className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4 text-zinc-800" />
                </button>

                <div className="text-xs text-zinc-400 whitespace-nowrap">
                  {searchResults.length > 0
                    ? `${selectedResultIndex + 1} / ${searchResults.length}`
                    : "0 / 0"}
                </div>

                {/* SEARCH */}

                <button
                  onClick={handleSearch}
                  className="h-10 px-4 rounded-xl font-semibold flex items-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor: "#2563EB",
                    color: "white",
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* MIDDLE INSPECTOR */}
          {/* ========================================= */}

          <div
            className="flex-1 border-r flex flex-col min-w-0"
            style={{ borderColor: "var(--panel-border)" }}
          >
            {/* INSPECTOR CONTENT */}

            <div className="flex-1 overflow-hidden flex flex-col relative">
              {/* FONT SIZE */}
              <div
                className="absolute top-2 right-2 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ backgroundColor: controlBg }}
              >
                <div className="text-[11px] text-zinc-500">Font</div>
                <button
                  onClick={decreaseFontSize}
                  type="button"
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: controlButtonBg,
                    color: controlButtonText,
                  }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  className="w-8 text-center text-sm"
                  style={{ color: controlButtonText }}
                >
                  {fontSize}
                </span>
                <button
                  onClick={increaseFontSize}
                  type="button"
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: controlButtonBg,
                    color: controlButtonText,
                  }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div
                className="
    flex-1 
    overflow-y-auto overflow-x-hidden
    p-5 
    outline-none

    scrollbar-thin
    scrollbar-track-transparent
    scrollbar-thumb-[#1E293B]
    hover:scrollbar-thumb-[#334155]

    [&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar]:h-2

    [&::-webkit-scrollbar-track]:bg-transparent

    [&::-webkit-scrollbar-thumb]:bg-[#1E293B]
    [&::-webkit-scrollbar-thumb]:rounded-full

    hover:[&::-webkit-scrollbar-thumb]:bg-[#334155]

    [&::-webkit-scrollbar-corner]:bg-transparent
  "
                style={{ fontSize: `${fontSize}px` }}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onPaste={(e) => {
                  e.preventDefault();

                  const text = e.clipboardData.getData("text");

                  updateSlotInput(text);
                }}
                onInput={(e) => {
                  const text = e.currentTarget.textContent || "";

                  updateSlotInput(text);
                }}
              >
                {/* ERROR */}

                {activeSlot?.jsonError && (
                  <div className="text-red-400 mb-4">
                    {activeSlot.jsonError}
                  </div>
                )}

                {/* EMPTY STATE */}

                {!activeSlot?.jsonData && !activeSlot?.jsonError && (
                  <div className="h-full flex items-center justify-center flex-col gap-4">
                    <div className="text-zinc-600 text-lg">
                      Paste JSON directly here
                    </div>
                    <div className="text-zinc-600 text-sm">or</div>
                    <label className="px-4 py-2 rounded-xl bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-colors text-sm">
                      Upload JSON File
                      <input
                        type="file"
                        accept=".json,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* JSON VIEWER */}

                {activeSlot?.jsonData && (
                  <JsonNode
                    data={activeSlot.jsonData}
                    name="data"
                    path="data"
                    highlightedPath={highlightedPath}
                    copied={copied}
                    onCopy={handleCopy}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* RIGHT SEARCH PANEL */}
          {/* ========================================= */}

          <div
            className="flex flex-col min-w-0 overflow-hidden"
            style={{ backgroundColor: "var(--panel-bg)", width: 350 }}
          >
            {/* SEARCH HEADER */}

            {/* SEARCH RESULTS */}

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1E293B] hover:scrollbar-thumb-[#334155] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1E293B] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-corner]:bg-transparent">
              {searchResults.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-sm text-zinc-500"
                  style={{
                    border: "1px dashed var(--panel-border)",
                    backgroundColor: "var(--panel-bg)",
                  }}
                >
                  Search any key to inspect mappings
                </div>
              ) : (
                searchResults.map((result, index) => {
                  const mappings = generateMappings(result.path);

                  return (
                    <div
                      key={index}
                      className="rounded-xl border p-5 cursor-pointer"
                      style={{
                        borderColor:
                          selectedResultIndex === index
                            ? "var(--selected-border)"
                            : "var(--panel-border)",
                        backgroundColor:
                          selectedResultIndex === index
                            ? "var(--selected-bg)"
                            : "var(--panel-bg)",
                      }}
                    >
                      {/* PATH */}

                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => {
                            setSelectedResultIndex(index);
                            setHighlightedPath(result.path);

                            setTimeout(() => {
                              const el = document.querySelector(
                                `[data-path="${result.path}"]`,
                              );

                              el?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                            }, 50);
                          }}
                          className={`break-all text-left  cursor-pointer ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
                        >
                          {result.path}
                        </button>

                        <button
                          onClick={() => handleCopy(result.path, result.path)}
                        >
                          <Copy className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>

                      {/* VALUE */}

                      <div
                        className={`mt-4 rounded-xl p-2 overflow-auto ${
                          theme === "light" ? "bg-white" : "bg-white/20"
                        }`}
                        style={{
                          borderColor: "var(--panel-border)",
                          borderStyle: "solid",
                        }}
                      >
                        <pre
                          className={`text-sm whitespace-pre-wrap break-all ${
                            theme === "light"
                              ? "text-zinc-800"
                              : "text-zinc-300"
                          }`}
                        >
                          {JSON.stringify(result.value, null, 2)}
                        </pre>
                      </div>

                      {/* MAPPING */}

                      {/* <div className="grid gap-4 mt-4">
     

                      <div
                        className="rounded-xl"
                        style={{
                          backgroundColor: "transparent",
                          borderColor: "var(--panel-border)",
                          borderStyle: "solid",
                        }}
                      >
                        <div className="text-xs text-zinc-500 mb-2">
                          NEXT JS
                        </div>

                        <code className="text-sm break-all text-orange-400">
                          {mappings.next}
                        </code>
                      </div>


                      <div
                        className="rounded-xl"
                        style={{
                          backgroundColor: "transparent",
                          borderColor: "var(--panel-border)",
                          borderStyle: "solid",
                        }}
                      >
                        <div className="text-xs text-zinc-500 mb-2">VUE</div>

                        <code className="text-sm break-all text-sky-400">
                          {mappings.vue}
                        </code>
                      </div>
                    </div> */}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const JsonNode = memo(function JsonNode({
  data,
  name,
  path,
  highlightedPath,
  copied,
  onCopy,
}: any) {
  const [collapsed, setCollapsed] = useState(false);

  const isObject =
    typeof data === "object" && data !== null && !Array.isArray(data);

  const isArray = Array.isArray(data);

  const highlight = highlightedPath === path;

  /* PRIMITIVE */

  if (!isObject && !isArray) {
    return (
      <div
        data-path={path}
        className={`group pl-6 py-1 rounded-lg flex items-center gap-1 flex-wrap ${highlight ? "bg-white/20 border border-blue-400" : ""}`}
      >
        <span
          className="font-medium"
          style={{
            color: "var(--main-color)",
          }}
        >
          {String(name)}
        </span>

        <span className="text-zinc-500"> : </span>

        <span
          className={`break-all ${
            typeof data === "string"
              ? "text-emerald-300"
              : typeof data === "number"
                ? "text-orange-300"
                : "text-blue-300"
          }`}
        >
          {JSON.stringify(data)}
        </span>

        <button
          onClick={() => onCopy(JSON.stringify(data), path)}
          className="opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
        >
          {copied === path ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>
    );
  }

  /* OBJECT */

  return (
    <div data-path={path} className="">
      <div
        data-path={path}
        className={`group flex items-center gap-2 py-1 px-2 rounded-lg  ${
          highlight ? "bg-white/5" : ""
        }`}
      >
        <button
          className="cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        <span
          className="font-semibold"
          style={{
            color: "var(--object-color)",
          }}
        >
          {String(name)}
        </span>

        <span
          style={{
            color: "var(--object-color)",
          }}
        >
          {isArray ? "[ ]" : "{ }"}
        </span>

        <button
          onClick={() =>
            onCopy(
              JSON.stringify(
                {
                  [String(name)]: data,
                },
                null,
                2,
              ),
              path,
            )
          }
          className="opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          {copied === path ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="ml-4">
          {Array.isArray(data)
            ? data.map((item, index) => (
                <JsonNode
                  key={index}
                  data={item}
                  name={index}
                  path={`${path}[${index}]`}
                  highlightedPath={highlightedPath}
                  copied={copied}
                  onCopy={onCopy}
                />
              ))
            : Object.entries(data).map(([key, value]) => (
                <JsonNode
                  key={key}
                  data={value}
                  name={key}
                  path={`${path}.${key}`}
                  highlightedPath={highlightedPath}
                  copied={copied}
                  onCopy={onCopy}
                />
              ))}
        </div>
      )}
    </div>
  );
});
