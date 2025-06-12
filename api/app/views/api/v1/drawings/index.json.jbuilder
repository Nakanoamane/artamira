json.drawings do
  json.array! @drawings do |drawing|
    json.partial! 'api/v1/drawings/drawing', drawing: drawing
  end
end

json.meta do
  json.total_pages @drawings.total_pages
  json.total_count @drawings.total_count
  json.current_page @drawings.current_page
  json.per_page @drawings.limit_value
end
