import { NextApiRequest, NextApiResponse } from "next";
import {
  genericEditorSaveFormResponse,
  creatLockResponse,
  genericEditorReviewFormResponse,
  genericEditorRequestForChangesFormResponse,
  publishResourceFormResponse,
} from "./mocked-response";
import { getCookie } from '@workspace/utils/cookieHelper';
import { mockData } from "./tenantConfig";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, body, query } = req;
  const { path } = query;

  const token = getCookie(req, 'authToken') || process.env.AUTH_API_TOKEN as string;

  const BASE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL as string;
  const tenantId = getCookie(req, 'tenantId') || process.env.NEXT_PUBLIC_TENANT_ID as string;

  const tenantConfig = mockData[tenantId];

  console.log('tenantConfig ==>', tenantConfig)

  if (!tenantConfig) {
    return res.status(404).json({ message: "Tenant configuration not found" });
  }
  const CHANNEL_ID  = tenantConfig?.CHANNEL_ID;

  if (!token) {
    console.error("No valid token available");
    return res.status(401).json({ message: "Unauthorized: Token is required" });
  }

  // console.log("Using token:", token);

  let pathString = Array.isArray(path) ? path.join("/") : (path as string);


  if (pathString === "/action/data/v1/form/read") {
    const { action, subType, type } = body.request;
    if (action === "save" && subType === "resource") {
      return res.status(200).json(genericEditorSaveFormResponse);
    }
    if (action === "review" && subType === "resource") {
      return res.status(200).json(genericEditorReviewFormResponse);
    }
    if (action === "requestforchanges" && subType === "resource") {
      return res.status(200).json(genericEditorRequestForChangesFormResponse);
    }
    if (action === "publish" && subType === "resource" && type === 'content') {
      return res.status(200).json(publishResourceFormResponse); 
    }
  }

  if (pathString === "/action/lock/v1/create") {
    return res.status(200).json(creatLockResponse);
  }

  if (pathString.startsWith("/action/framework/v3/read/")) {
    pathString = pathString.replace(
      "/action/framework/v3/read/",
      "/api/framework/v1/read/"
    );
  }

  const queryString = req.url?.includes("?") ? req.url.split("?")[1] : "";
  const targetUrl = `${BASE_URL}${pathString}${
    queryString ? `?${queryString}` : ""
  }`;

  console.log("targetUrl =====>", targetUrl);

  try {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "tenantId": tenantId,
        "X-Channel-Id": CHANNEL_ID,
      },
      ...(method === "POST" || method === "PATCH"
        ? { body: JSON.stringify(body) }
        : {}),
    };

    console.log("options =====>", options);
    const response = await fetch(targetUrl, options);
    console.log("response =====>", response);
    const data = await response.json();
    console.log("data =====>", data);

    if (pathString.startsWith("/api/framework/v1/read/")) {
      sortFrameworkCategoryTerms(data, ["subject"]);
    }
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error("Error in proxy:", error.message);

    if (error?.response?.data?.responseCode === 401) {
      return res.status(401).json({ message: "Unauthorized: Token is invalid" });
    } else {
      res
      .status(500)
      .json({ message: "Error fetching data", error: error.message });
    }
  }
}

// Sort the terms of the given framework categories alphabetically by name so
// dropdowns in the content editor form (e.g. Subject) render in A-Z order.
function sortFrameworkCategoryTerms(data: any, categoryCodes: string[]) {
  const categories = data?.result?.framework?.categories;
  if (!Array.isArray(categories)) return;

  categories.forEach((category: any) => {
    if (!categoryCodes.includes(category?.code) || !Array.isArray(category?.terms)) {
      return;
    }
    category.terms.sort((a: any, b: any) =>
      (a?.name ?? "").localeCompare(b?.name ?? "", undefined, { sensitivity: "base" })
    );
    // Keep `index` consistent with the new order in case the editor sorts by it
    category.terms.forEach((term: any, i: number) => {
      term.index = i + 1;
    });
  });
}
