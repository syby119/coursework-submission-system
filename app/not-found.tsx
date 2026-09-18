import Link from "next/link";

export default function NotFound() {
  return <main className="flex flex-1 flex-col items-center justify-center px-4 text-center"><h1 className="text-2xl font-bold text-slate-900">页面不存在或你没有访问权限</h1><Link className="mt-4 text-indigo-700 hover:text-indigo-900" href="/">返回首页</Link></main>;
}
