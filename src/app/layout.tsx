import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studyspace · RWTH Data Science",
  description: "Your personal study planner for the MSc Data Science at RWTH Aachen. Courses, exams, quizzes and your journey to 120 ECTS.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
