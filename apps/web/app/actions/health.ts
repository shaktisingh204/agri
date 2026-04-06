"use server";

export async function getHealth() {
  return {
    status: "ok",
    service: "agri-web",
    timestamp: new Date().toISOString(),
  };
}
