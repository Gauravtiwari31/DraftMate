SAMPLES — what each file is for (all content is fictional or public)

reference_nda.docx / reference_nda.pdf
  Fictional mutual NDA. Upload with the "reference" toggle: the app builds a
  style profile from it and drafts in its tone. Use the .docx normally; the
  .pdf is the same NDA for testing PDF upload. Both must upload fine.

source_letter.docx
  Fictional instruction letter (rent arrears dispute). Upload with the
  "source" toggle: its text is retrieved into drafts as source material.

big_50page.docx
  50-page synthetic contract (200 clauses). Upload as "source" to show the
  token meter: ~15,000 full tokens but only ~1,300 sent (BM25 retrieval).

demo_draft.docx
  Short draft with 3 citations: two real (Kesavananda Bharati (1973) 4 SCC
  225, Maneka Gandhi (1978) 1 SCC 248) and one planted fake (Balakrishnan
  Menon (1989) 3 SCC 412). Paste its text into the draft pane and click
  "Verify citations": expect 2 green, 1 red.

scanned.pdf
  A PDF with no extractable text. Upload it: the app must show a clear
  error (HTTP 422 "no extractable text"), never a crash.

Regenerate everything with: python gen_samples.py
