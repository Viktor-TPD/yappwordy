"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Board, Question } from "@/types";
import {
  createBoard,
  updateBoard,
  createQuestions,
  deleteQuestions,
} from "@/lib/database";
import Link from "next/link";
import styles from "./BoardBuilder.module.css";

interface BoardBuilderProps {
  userId: string;
  existingBoard?: Board;
  existingQuestions?: Question[];
}

interface QuestionData {
  question: string;
  answer: string;
}

// Always store as 200-1000, display as Question 1-5
const STORED_VALUES = [200, 400, 600, 800, 1000];

export function BoardBuilder({
  userId,
  existingBoard,
  existingQuestions = [],
}: BoardBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(existingBoard?.title || "");
  const [categories, setCategories] = useState<string[]>(
    existingBoard?.categories || ["", "", "", "", ""]
  );
  const [questions, setQuestions] = useState<Record<string, QuestionData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number>(0);

  useEffect(() => {
    if (existingQuestions.length > 0) {
      const questionsMap: Record<string, QuestionData> = {};
      existingQuestions.forEach((q) => {
        const key = `${q.category_index}-${q.point_value}`;
        questionsMap[key] = {
          question: q.question_text,
          answer: q.answer_text,
        };
      });
      setQuestions(questionsMap);
    }
  }, [existingQuestions]);

  const addCategory = () => {
    if (categories.length < 6) {
      setCategories([...categories, ""]);
    }
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      const newCategories = categories.filter((_, i) => i !== index);
      setCategories(newCategories);

      const newQuestions = { ...questions };
      STORED_VALUES.forEach((pv) => {
        delete newQuestions[`${index}-${pv}`];
      });
      setQuestions(newQuestions);

      if (activeCategory >= newCategories.length) {
        setActiveCategory(Math.max(0, newCategories.length - 1));
      }
    }
  };

  const updateCategory = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = value;
    setCategories(newCategories);
  };

  const updateQuestionData = (
    categoryIndex: number,
    pointValue: number,
    field: keyof QuestionData,
    value: string
  ) => {
    const key = `${categoryIndex}-${pointValue}`;
    setQuestions((prev) => ({
      ...prev,
      [key]: {
        question: prev[key]?.question || "",
        answer: prev[key]?.answer || "",
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a board title");
      return;
    }

    const filledCategories = categories.filter((c) => c.trim());
    if (filledCategories.length === 0) {
      alert("Please enter at least one category");
      return;
    }

    setIsSaving(true);

    try {
      let boardId = existingBoard?.id;

      if (existingBoard) {
        await updateBoard(existingBoard.id, {
          title,
          categories: filledCategories,
        });
      } else {
        const newBoard = await createBoard(userId, title, filledCategories);
        if (!newBoard) {
          throw new Error("Failed to create board");
        }
        boardId = newBoard.id;
      }

      if (existingBoard) {
        await deleteQuestions(boardId!);
      }

      const questionsList: Omit<Question, "id">[] = [];
      filledCategories.forEach((_, categoryIndex) => {
        STORED_VALUES.forEach((pointValue) => {
          const key = `${categoryIndex}-${pointValue}`;
          const data = questions[key];
          if (data?.question?.trim() && data?.answer?.trim()) {
            questionsList.push({
              board_id: boardId!,
              category_index: categoryIndex,
              point_value: pointValue,
              question_text: data.question,
              answer_text: data.answer,
              is_daily_double: false, // Will be set randomly when game starts
            });
          }
        });
      });

      if (questionsList.length > 0) {
        await createQuestions(questionsList);
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving board:", error);
      alert("Failed to save board. Please try again.");
      setIsSaving(false);
    }
  };

  const filledCategories = categories.filter((c) => c.trim());

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <label className={styles.label}>BOARD TITLE</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter board title..."
          className={styles.titleInput}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <label className={styles.label}>
            CATEGORIES ({categories.length}/6)
          </label>
          {categories.length < 6 && (
            <button onClick={addCategory} className={styles.addButton}>
              + ADD CATEGORY
            </button>
          )}
        </div>

        <div className={styles.categoriesList}>
          {categories.map((category, index) => (
            <div key={index} className={styles.categoryInput}>
              <input
                type="text"
                value={category}
                onChange={(e) => updateCategory(index, e.target.value)}
                placeholder={`Category ${index + 1}`}
                className={styles.input}
              />
              {categories.length > 1 && (
                <button
                  onClick={() => removeCategory(index)}
                  className={styles.removeButton}
                  aria-label="Remove category"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {filledCategories.length > 0 && (
        <div className={styles.section}>
          <label className={styles.label}>QUESTIONS</label>

          <div className={styles.tabs}>
            {filledCategories.map((category, index) => (
              <button
                key={index}
                onClick={() => setActiveCategory(index)}
                className={`${styles.tab} ${
                  activeCategory === index ? styles.tabActive : ""
                }`}
              >
                {category || `Category ${index + 1}`}
              </button>
            ))}
          </div>

          <div className={styles.questionsGrid}>
            {STORED_VALUES.map((pointValue, idx) => {
              const key = `${activeCategory}-${pointValue}`;
              const data = questions[key] || {
                question: "",
                answer: "",
              };

              return (
                <div key={pointValue} className={styles.questionCard}>
                  <div className={styles.questionHeader}>
                    <span className={styles.pointValue}>
                      Question {idx + 1}
                    </span>
                  </div>

                  <div className={styles.questionInputs}>
                    <textarea
                      value={data.question}
                      onChange={(e) =>
                        updateQuestionData(
                          activeCategory,
                          pointValue,
                          "question",
                          e.target.value
                        )
                      }
                      placeholder="Question..."
                      className={styles.textarea}
                      rows={3}
                    />
                    <textarea
                      value={data.answer}
                      onChange={(e) =>
                        updateQuestionData(
                          activeCategory,
                          pointValue,
                          "answer",
                          e.target.value
                        )
                      }
                      placeholder="Answer..."
                      className={styles.textarea}
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={styles.saveButton}
        >
          {isSaving
            ? "SAVING..."
            : existingBoard
            ? "UPDATE BOARD"
            : "CREATE BOARD"}
        </button>

        <Link href="/dashboard" className={styles.cancelButton}>
          CANCEL
        </Link>
      </div>
    </div>
  );
}
