"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/guards";
import { createStudent, createStudents, deleteStudent, findUserByStudentNumber } from "@/lib/db/users";
import { t, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { removeStoredFile } from "@/lib/storage/local";
import { parseStudentRosterXlsx, StudentRosterImportError } from "@/lib/students/import-xlsx";

const INITIAL_STUDENT_PASSWORD = "123456";
const MAX_STUDENT_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

function redirectWithMessage(path: string, key: "error" | "success", message: string): never {
  const [pathname, search = ""] = path.split("?", 2);
  const searchParams = new URLSearchParams(search);
  searchParams.set(key, message);
  redirect(`${pathname}?${searchParams.toString()}`);
}

function isDuplicateStudentNumberError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "23505";
}

function studentValues(formData: FormData, locale: Locale) {
  const studentNumber = String(formData.get("student_number") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!studentNumber || !name || studentNumber.length > 64 || name.length > 100) {
    return { error: t(locale, "studentDetailsInvalid") };
  }
  return { values: { studentNumber, name } };
}

function importErrorMessage(error: StudentRosterImportError, locale: Locale) {
  const rowNumber = String(error.details.rowNumber ?? "");
  const headers = error.details.headers ?? ["", ""];
  const headerValue = (value: string) => value || t(locale, "studentImportEmptyCell");
  switch (error.code) {
    case "missingWorksheet": return t(locale, "studentImportMissingWorksheet");
    case "invalidHeaders": return t(locale, "studentImportHeadersInvalid", { firstHeader: headerValue(headers[0]), secondHeader: headerValue(headers[1]) });
    case "missingName": return t(locale, "studentImportMissingName", { rowNumber });
    case "missingStudentNumber": return t(locale, "studentImportMissingStudentNumber", { rowNumber });
    case "nameTooLong": return t(locale, "studentImportNameTooLong", { rowNumber });
    case "studentNumberTooLong": return t(locale, "studentImportStudentNumberTooLong", { rowNumber });
    case "tooManyRows": return t(locale, "studentImportTooManyRows");
    case "emptyRoster": return t(locale, "studentImportEmpty");
    case "duplicateStudentNumbers": return t(locale, "studentImportDuplicates", { studentNumbers: error.details.studentNumbers?.join(", ") ?? "" });
    default: return t(locale, "studentImportFailed");
  }
}

export async function createStudentAction(errorPath: string, successPath: string, formData: FormData) {
  const locale = await getLocale();
  await requireAdmin();
  const parsed = studentValues(formData, locale);
  if ("error" in parsed) redirectWithMessage(errorPath, "error", parsed.error ?? t(locale, "studentAddFailed"));

  try {
    if (await findUserByStudentNumber(parsed.values.studentNumber)) {
      redirectWithMessage(errorPath, "error", t(locale, "studentNumberDuplicate", { studentNumber: parsed.values.studentNumber }));
    }
    await createStudent({ ...parsed.values, passwordHash: await hashPassword(INITIAL_STUDENT_PASSWORD) });
  } catch (error) {
    console.error("Student creation failed", error);
    if (isDuplicateStudentNumberError(error)) {
      redirectWithMessage(errorPath, "error", t(locale, "studentNumberDuplicate", { studentNumber: parsed.values.studentNumber }));
    }
    redirectWithMessage(errorPath, "error", t(locale, "studentAddFailed"));
  }

  revalidatePath("/admin/students");
  redirectWithMessage(successPath, "success", t(locale, "studentAdded"));
}

export async function importStudentsAction(errorPath: string, successPath: string, formData: FormData) {
  const locale = await getLocale();
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    redirectWithMessage(errorPath, "error", t(locale, "studentImportSelectFile"));
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) redirectWithMessage(errorPath, "error", t(locale, "studentImportFileTypeInvalid"));
  if (file.size > MAX_STUDENT_IMPORT_FILE_SIZE) redirectWithMessage(errorPath, "error", t(locale, "studentImportFileTooLarge", { size: 10 }));

  let students;
  try {
    students = await parseStudentRosterXlsx(await file.arrayBuffer());
  } catch (error) {
    if (error instanceof StudentRosterImportError) {
      redirectWithMessage(errorPath, "error", importErrorMessage(error, locale));
    }
    console.error("Student Excel parsing failed", error);
    redirectWithMessage(errorPath, "error", t(locale, "studentImportUnreadableFile"));
  }

  try {
    const passwordHashes = await Promise.all(students.map(() => hashPassword(INITIAL_STUDENT_PASSWORD)));
    const result = await createStudents(students.map((student, index) => ({ ...student, passwordHash: passwordHashes[index] })));
    if (result.existingStudentNumbers.length) {
      redirectWithMessage(errorPath, "error", t(locale, "studentImportExisting", { studentNumbers: result.existingStudentNumbers.join(", ") }));
    }
  } catch (error) {
    console.error("Student Excel import failed", error);
    if (isDuplicateStudentNumberError(error)) {
      redirectWithMessage(errorPath, "error", t(locale, "studentImportDuplicateDatabase"));
    }
    redirectWithMessage(errorPath, "error", t(locale, "studentImportFailed"));
  }

  revalidatePath("/admin/students");
  redirectWithMessage(successPath, "success", t(locale, "studentImportSuccess", { count: students.length }));
}

export async function deleteStudentAction(studentId: string) {
  const locale = await getLocale();
  await requireAdmin();
  let result;
  try {
    result = await deleteStudent(studentId);
  } catch (error) {
    console.error("Student deletion failed", error);
    redirectWithMessage("/admin/students", "error", t(locale, "studentDeleteFailed"));
  }
  if (!result.deleted) redirectWithMessage("/admin/students", "error", t(locale, "studentMissing"));

  for (const storagePath of result.paths) {
    removeStoredFile(storagePath).catch((error: unknown) => {
      console.error("Could not remove deleted student file", error);
    });
  }
  revalidatePath("/admin/students");
  redirectWithMessage("/admin/students", "success", t(locale, "studentDeleted"));
}
