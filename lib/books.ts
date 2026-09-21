import fs from "fs";
import path from "path";

export type Book = {
  id: string;
  name: string;
  subject: string;
  cover: string;
  units: Unit[];
};

export type Unit = {
  id: string;
  name: string;
  startProblem: number;
  endProblem: number;
};

const booksDirectory = path.join(process.cwd(), "data", "books");

export function getBooks(): Book[] {
  const fileNames = fs.readdirSync(booksDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(booksDirectory, fileName);
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Book;
    });
}

export function getBook(bookId: string) {
  return getBooks().find((book) => book.id === bookId);
}

export function getUnit(bookId: string, unitId: string) {
  return getBook(bookId)?.units.find((unit) => unit.id === unitId);
}

export function getProblems(unit: Unit) {
  return Array.from(
    { length: unit.endProblem - unit.startProblem + 1 },
    (_, index) => unit.startProblem + index
  );
}

export function getTotalProblems(book: Book) {
  return book.units.reduce(
    (total, unit) => total + unit.endProblem - unit.startProblem + 1,
    0
  );
}
