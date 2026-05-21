import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const API_URL = process.env["API_URL"] || "http://localhost:3000";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "1.0.0",
      description: "A full-featured REST API that mimics Airbnb — users can register, list properties, make bookings, upload photos, and more. Built with Node.js, Express, TypeScript, and PostgreSQL.",
    },
    servers: [
      {
        url: `${API_URL}/api/v1`,
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
    },
  },
  apis: ["./src/routes/v1/*.ts"],
};

export const setupSwagger = (app: Express): void => {
  const swaggerSpec = swaggerJsdoc(options);

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("📚 Swagger docs available at http://localhost:3000/api-docs");
};