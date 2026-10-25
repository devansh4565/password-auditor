"""Render an audit result dict to a PDF with ReportLab (pure Python, installs on Render)."""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)

INK = colors.HexColor("#121212")
STEEL = colors.HexColor("#8a9198")
TEAL = colors.HexColor("#1f9e8f")
RED = colors.HexColor("#d7443b")


def build_pdf(audit: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                            leftMargin=18 * mm, rightMargin=18 * mm, title="Password Audit Report")
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], textColor=INK, fontName="Courier-Bold", fontSize=20)
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], textColor=INK, fontName="Helvetica-Bold", fontSize=12,
                        spaceBefore=10)
    body = ParagraphStyle("body", parent=ss["BodyText"], fontSize=9.5, leading=14)
    small = ParagraphStyle("small", parent=body, textColor=STEEL, fontSize=8)
    story = []

    story.append(Paragraph("Password Audit Report", h1))
    story.append(Paragraph(f"Generated {audit['generated_at']} &nbsp;·&nbsp; synthetic dataset", small))
    story.append(Spacer(1, 8))

    stat = [["Accounts", "Recovered", "% recovered", "Weak storage"],
            [str(audit["total"]), str(audit["cracked"]), f"{audit['cracked_pct']}%", str(audit["weak_storage"])]]
    t = Table(stat, colWidths=[42 * mm] * 4)
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
        ("FONT", (0, 1), (-1, 1), "Courier-Bold", 16),
        ("TEXTCOLOR", (0, 0), (-1, 0), STEEL),
        ("TEXTCOLOR", (1, 1), (2, 1), RED),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2), ("TOPPADDING", (0, 1), (-1, 1), 2),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, STEEL),
    ]))
    story.append(t)

    story.append(Paragraph("Storage algorithms", h2))
    algo_rows = [["Algorithm", "Count", "Assessment"]]
    verdict = {"md5": "Broken – reversible", "sha1": "Broken – reversible", "sha256": "Unsalted, fast",
               "bcrypt": "Acceptable", "argon2id": "Recommended", "unknown": "Unrecognised"}
    for algo, n in sorted(audit["algorithms"].items(), key=lambda kv: -kv[1]):
        algo_rows.append([algo, str(n), verdict.get(algo, "")])
    at = Table(algo_rows, colWidths=[40 * mm, 20 * mm, 90 * mm])
    at.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9), ("FONT", (0, 1), (-1, -1), "Courier", 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), STEEL), ("LINEBELOW", (0, 0), (-1, 0), 0.5, STEEL),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f4f5")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(at)

    story.append(Paragraph("Recommendations", h2))
    for r in audit["recommendations"]:
        story.append(Paragraph("• " + r, body))
        story.append(Spacer(1, 3))

    if audit["reused"]:
        story.append(Paragraph("Reused passwords", h2))
        for p, n in audit["reused"].items():
            story.append(Paragraph(f"<font face='Courier'>{p}</font> &nbsp; used by {n} accounts", body))

    story.append(Paragraph("Recovered accounts (first 40)", h2))
    rows = [["Account", "Algorithm", "Status", "Password"]]
    for r in audit["rows"]:
        if r["cracked"]:
            rows.append([r["user"][:34], r["algorithm"], "recovered", r.get("plaintext", "")])
    for r in audit["rows"]:
        if not r["cracked"] and len(rows) < 41:
            rows.append([r["user"][:34], r["algorithm"], "not recovered", "—"])
    rows = rows[:41]
    rt = Table(rows, colWidths=[62 * mm, 26 * mm, 32 * mm, 30 * mm], repeatRows=1)
    rt.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8), ("FONT", (0, 1), (-1, -1), "Courier", 8),
        ("TEXTCOLOR", (0, 0), (-1, 0), STEEL), ("LINEBELOW", (0, 0), (-1, 0), 0.5, STEEL),
        ("TEXTCOLOR", (2, 1), (2, -1), RED), ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f4f5")]),
    ]))
    story.append(rt)
    story.append(Spacer(1, 8))
    story.append(Paragraph("Passwords are masked. Dataset is synthetic; generated for the Password Strength &amp; "
                           "Secure Storage Auditor (CSN 446 / CSF 446, Project 4).", small))

    doc.build(story)
    return buf.getvalue()
