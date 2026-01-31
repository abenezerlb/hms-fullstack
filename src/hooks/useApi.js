

import { useState, useCallback } from "react";

/**
 * Custom hook for API calls with loading and error states
 * @param {Function} apiFunction - The API service function to call
 * @returns {Object} - { data, loading, error, execute, reset }
 */
export const useApi = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

/**
 * Custom hook for paginated API calls
 * @param {Function} apiFunction - The API service function
 * @param {number} pageSize - Items per page
 */
export const usePaginatedApi = (apiFunction, pageSize = 10) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async (pageNum = 1, filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction({
        page: pageNum,
        limit: pageSize,
        ...filters,
      });

      if (pageNum === 1) {
        setData(result.data || result);
      } else {
        setData((prev) => [...prev, ...(result.data || result)]);
      }

      setPage(pageNum);
      setTotal(result.total || 0);
      setHasMore(result.hasMore ?? (result.data?.length === pageSize));
      
      return result;
    } catch (err) {
      setError(err.message || "Failed to fetch data");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, pageSize]);

  const loadMore = useCallback(async (filters = {}) => {
    if (!hasMore || loading) return;
    return fetch(page + 1, filters);
  }, [fetch, page, hasMore, loading]);

  const refresh = useCallback(async (filters = {}) => {
    setPage(1);
    return fetch(1, filters);
  }, [fetch]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    page,
    hasMore,
    total,
    fetch,
    loadMore,
    refresh,
    reset,
  };
};

/**
 * Custom hook for form submission
 * @param {Function} submitFunction - The API function to submit data
 * @param {Object} options - Options including onSuccess and onError callbacks
 */
export const useFormSubmit = (submitFunction, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { onSuccess, onError, resetOnSuccess = true } = options;

  const submit = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await submitFunction(formData);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(result);
      }

      if (resetOnSuccess) {
        setTimeout(() => setSuccess(false), 3000);
      }

      return result;
    } catch (err) {
      const errorMessage = err.message || "Submission failed";
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [submitFunction, onSuccess, onError, resetOnSuccess]);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { submit, loading, error, success, reset };
};

export default useApi;
