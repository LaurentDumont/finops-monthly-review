FROM nginx:alpine

# Copy HTML file
COPY index.html /usr/share/nginx/html/

# Copy static files
COPY static/ /usr/share/nginx/html/static/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]