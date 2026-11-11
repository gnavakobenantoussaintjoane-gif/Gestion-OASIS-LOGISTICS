import type { RequestHandler } from "express";
import { check, HttpError } from "../utils/errors.js";
export const requireSuperAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const { data, error } = await req.db.rpc("oasis_is_super_admin");
    check(error);
    if (data !== true) throw new HttpError(403, "Super administrateur requis.");
    next();
  } catch (error) {
    next(error);
  }
};
