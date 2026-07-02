import reportService from "../services/reportService.js";
import fs from "fs";
import path from "path";

const createTextReport = async (req, res, next) => {
  try {
    const { title, rawText, text } = req.body;
    const ngoId = req.user.ngoId;
    const userId = req.user.id;

    const reportText = rawText || text;

    if (!title || !reportText) {
      return res.status(400).json({
        success: false,
        message: "Title and description content (text) are required",
      });
    }

    const report = await reportService.createTextReport(
      { title, rawText: reportText },
      ngoId,
      userId,
    );

    res.status(201).json({
      success: true,
      message: "Text report created successfully",
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

const createPdfReport = async (req, res, next) => {
  let pdfPath = null;

  try {
    const { title } = req.body;
    const ngoId = req.user.ngoId;
    const userId = req.user.id;

    if (!title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Title and PDF file are required",
      });
    }

    pdfPath = `/uploads/reports/${req.file.filename}`;

    const report = await reportService.createPdfReport(
      { title, rawText: "" },
      ngoId,
      userId,
      pdfPath,
    );

    res.status(201).json({
      success: true,
      message: "PDF report uploaded and text extracted successfully",
      data: report,
    });
  } catch (err) {
    // Cleaning uploaded file if anything fails
    if (pdfPath && req.file) {
      const fullPath = path.join(
        process.cwd(),
        "uploads/reports",
        req.file.filename,
      );
      fs.unlink(fullPath, () => {});
    }
    next(err);
  }
};

const getAllReports = async (req, res, next) => {
  try {
    const ngoId = req.user.ngoId;
    const reports = await reportService.getAllReports(ngoId);

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ngoId = req.user.ngoId;

    const report = await reportService.getReportById(id, ngoId);

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

export { createTextReport, createPdfReport, getAllReports, getReportById };
