-- Normalize existing transaction_date values to UTC ISO 8601 text.
-- This keeps transaction_date as TEXT but standardizes format as: YYYY-MM-DDTHH:MM:SS.SSSZ
--
-- Assumption for legacy values without timezone:
-- - They represent local time in UTC+8.
-- - We convert them to UTC by subtracting 8 hours.

UPDATE transactions
SET transaction_date = CASE
	WHEN transaction_date LIKE '____-__-__' THEN strftime('%Y-%m-%dT%H:%M:%fZ', datetime(transaction_date || ' 00:00:00', '-8 hours'))
	WHEN transaction_date LIKE '____-__-__ __:__' THEN strftime('%Y-%m-%dT%H:%M:%fZ', datetime(transaction_date || ':00', '-8 hours'))
	WHEN transaction_date LIKE '____-__-__ __:__:__' THEN strftime('%Y-%m-%dT%H:%M:%fZ', datetime(transaction_date, '-8 hours'))
	WHEN transaction_date LIKE '____-__-__T__:__' THEN strftime('%Y-%m-%dT%H:%M:%fZ', datetime(REPLACE(transaction_date, 'T', ' ') || ':00', '-8 hours'))
	WHEN transaction_date LIKE '____-__-__T__:__:__' THEN strftime('%Y-%m-%dT%H:%M:%fZ', datetime(REPLACE(transaction_date, 'T', ' '), '-8 hours'))
	ELSE transaction_date
END
WHERE transaction_date IS NOT NULL
	AND transaction_date NOT LIKE '%Z'
	AND transaction_date NOT LIKE '%+__:__'
	AND transaction_date NOT LIKE '%-__:__';
