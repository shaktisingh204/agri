import { utilities as nestWinstonModuleUtilities } from "nest-winston";
import { format, transports } from "winston";

export const winstonOptions = {
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.ms(),
    nestWinstonModuleUtilities.format.nestLike("AgriApi", {
      colors: false,
      prettyPrint: true
    })
  ),
  transports: [new transports.Console()]
};

