import React from "react";
import { Typography, Box, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

/**
 * Tiêu đề trang với breadcrumbs
 * @param {Object} props - Props
 * @param {string} props.title - Tiêu đề trang
 * @param {string} props.subtitle - Mô tả ngắn về trang
 * @param {Array} props.breadcrumbs - Danh sách breadcrumbs [{ label, to }]
 */
const PageTitle = ({ title, subtitle, breadcrumbs = [] }) => {
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link component={RouterLink} color="inherit" to="/">
            Trang chủ
          </Link>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography color="text.primary" key={index}>
                {crumb.label}
              </Typography>
            ) : (
              <Link
                component={RouterLink}
                color="inherit"
                to={crumb.to}
                key={index}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="subtitle1" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default PageTitle;
