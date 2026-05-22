-- PR 157 (L21): raise class-code entropy from 1 random letter (26 codes per
-- subject+grade → trivially enumerable) to 3 random letters (26^3 = 17,576).
-- Format changes from "MATH-8B" to "MATH-8-ABC". Same signature, so the
-- frontend rpc("generate_class_code", { p_subject, p_grade }) is unchanged;
-- CREATE OR REPLACE keeps the existing grants/owner; existing class codes
-- (old format) are untouched, and join_class_by_code matches by exact value
-- (no format validation anywhere), so the new format is fully compatible.

create or replace function public.generate_class_code(p_subject text, p_grade text)
returns text language plpgsql as $$
declare
  code text;
  exists_count integer;
  letters text;
begin
  loop
    -- PR 157: 3 random letters → 26^3 = 17,576 codes per (subject, grade).
    letters :=
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int);
    code := upper(left(p_subject, 4)) || '-' ||
            regexp_replace(p_grade, '[^0-9]', '', 'g') || '-' ||
            letters;
    select count(*) into exists_count from public.classes where class_code = code;
    exit when exists_count = 0;
  end loop;
  return code;
end;
$$;
