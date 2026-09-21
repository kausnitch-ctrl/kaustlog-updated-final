import { getBooks,getTotalProblems } from "../lib/books";
import HomeClient from "../components/HomeClient";
export default function HomePage(){return <HomeClient books={getBooks().map(b=>({id:b.id,name:b.name,subject:b.subject,cover:b.cover,totalProblems:getTotalProblems(b)}))}/>}
