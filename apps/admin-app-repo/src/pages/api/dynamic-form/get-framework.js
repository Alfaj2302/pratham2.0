// Generic breadth-first walk of a framework's term-association graph,
// starting from `startTerms` (terms of the source category), following
// `associations[]` links through any number of intermediate categories,
// until terms belonging to `targetCategory` are reached. Used to resolve
// indirect relationships (e.g. board -> medium -> stream) without any
// category name being hardcoded into the traversal itself, and without
// requiring the source category's terms to carry a direct association to
// the target category. Terms of `sourceCategory` itself are never walked
// through, so a selected board can't reach a sibling board (via a shared
// medium/grade) and pick up that board's streams.
function findAssociatedTermNames(
  framework,
  startTerms,
  targetCategory,
  allowedNames,
  sourceCategory
) {
  const allowedSet = Array.isArray(allowedNames) ? new Set(allowedNames) : null;
  const termsByIdentifier = {};
  (framework?.categories ?? []).forEach((category) => {
    (category?.terms ?? []).forEach((term) => {
      if (term?.identifier) {
        termsByIdentifier[term.identifier] = term;
      }
    });
  });

  const visited = new Set(startTerms.map((term) => term?.identifier).filter(Boolean));
  const queue = [...startTerms];
  const found = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    (current?.associations ?? []).forEach((assoc) => {
      if (!assoc?.identifier || visited.has(assoc.identifier)) {
        return;
      }
      visited.add(assoc.identifier);

      if (assoc.category === targetCategory) {
        if (!allowedSet || allowedSet.has(assoc.name)) {
          found.set(assoc.name, true);
        }
        return;
      }

      if (sourceCategory && assoc.category === sourceCategory) {
        return;
      }

      const nextTerm = termsByIdentifier[assoc.identifier];
      if (nextTerm) {
        queue.push(nextTerm);
      }
    });
  }

  return Array.from(found.keys());
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const {
        code,
        fetchUrl,
        selectedvalue,
        findcode,
        allowedValues,
        useAssociationGraph,
        directOnly,
      } = req.body;
      // directOnly (opt-in): only DIRECT associations of the selected term
      // (no association-graph walk, which can reach a sibling term's
      // children - e.g. another domain's skills), and/or every term of
      // `code` when nothing is selected - in both cases narrowed to
      // `allowedValues` when given. Used by the YouthNet batch form so
      // Skills only ever list the selected Domain's own skills.
      const allowedSet =
        Array.isArray(allowedValues) && allowedValues.length > 0
          ? new Set(allowedValues)
          : null;
      const keepAllowed = (option) =>
        !directOnly || !allowedSet || allowedSet.has(option.value);

      const axios = require('axios');

      let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: fetchUrl,
        headers: {
          Accept: '*/*',
        },
      };

      let updatedSelectedvalue = null;
      if (selectedvalue) {
        updatedSelectedvalue = Array.isArray(selectedvalue)
          ? selectedvalue
          : [selectedvalue];
      }

      axios
        .request(config)
        .then((response) => {
          let options = [];

          if (
            response?.data?.result?.framework?.categories &&
            response?.data?.result?.framework?.categories.length > 0
          ) {
            let frameworkFilter = response?.data?.result?.framework;

            frameworkFilter.categories.map((categories) => {
              if (categories?.code === code) {
                if (updatedSelectedvalue && updatedSelectedvalue.length > 0) {
                  // console.log('in found state', updatedSelectedvalue);
                  const categories_terms = categories?.terms;
                  // console.log('in categories_terms', categories_terms);
                  const filteredData = categories_terms?.filter((item) =>
                    selectedvalue.includes(item.name)
                  );
                  // console.log('in filteredData', filteredData);
                  if (filteredData) {
                    const hasAllowedValues =
                      Array.isArray(allowedValues) && allowedValues.length > 0;
                    const directOptions = filteredData.flatMap((data) =>
                      (data?.associations ?? [])
                        .filter((assoc) => assoc?.category === findcode)
                        .map((assoc) => ({
                          label: assoc.name,
                          value: assoc.name,
                        }))
                    );
                    if (
                      !directOnly &&
                      (hasAllowedValues || useAssociationGraph) &&
                      directOptions.length > 0
                    ) {
                      // The selected term(s) carry their own direct
                      // associations to the target category - use exactly
                      // those. Walking the graph here would also pull in
                      // targets reachable through terms shared with other
                      // selections (e.g. a medium shared by two boards),
                      // leaking another board's streams.
                      options = hasAllowedValues
                        ? directOptions.filter((option) =>
                            allowedValues.includes(option.value)
                          )
                        : directOptions;
                    } else if (
                      !directOnly &&
                      (hasAllowedValues || useAssociationGraph)
                    ) {
                      // Target category isn't necessarily a direct association of
                      // the selected term(s) (e.g. stream is only associated with
                      // medium, not board directly) - walk the association graph
                      // instead of reading `associations[]` in isolation. Callers
                      // opt into this explicitly (via allowedValues to restrict
                      // the result, or useAssociationGraph to resolve indirect
                      // relationships without restricting) so every other caller
                      // of this endpoint keeps its existing direct-only behavior.
                      options = findAssociatedTermNames(
                        frameworkFilter,
                        filteredData,
                        findcode,
                        hasAllowedValues ? allowedValues : null,
                        code
                      ).map((name) => ({ label: name, value: name }));
                    } else {
                      options = directOptions;
                    }
                  }
                  options = options.filter(keepAllowed);
                  // console.log('options', JSON.stringify(options));
                } else if (selectedvalue != '') {
                  // Transform terms into options
                  // console.log('in initial state');
                  options = categories?.terms
                    .filter((term) => term.status !== "Retired") // Filter out retired boards
                    .map((term) => ({
                      label: term.name,
                      value: term.name,
                    }))
                    .filter(keepAllowed);
                }
                // console.log('option', options);
              }
            });
          }
          const sortedOptions = options.sort((a, b) =>
            a.label.localeCompare(b.label)
          );
          const uniqueData = Array.from(
            new Map(sortedOptions.map((item) => [item.value, item])).values()
          );
          res.status(200).json({ options: uniqueData });
        })
        .catch((error) => {
          // console.log(error);
          res.status(500).json({ error: error.message });
        });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
